import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { CapturedLead, ChatTurn, ScheduledCall, Service } from '../types';
import { API_URL } from '../config';

interface Props {
  open: boolean;
  services: Service[];
  preselectedService: number | null;
  onClose: () => void;
  onSelectService: (id: number) => void;
}

function pillClass(active: boolean) {
  return 'sk-pill' + (active ? ' sk-pill--active' : '');
}

function greeting(serviceTitle: string | null): ChatTurn {
  const base = '¡Hola! Soy el asistente de SarKode 👋 Cuéntame en qué proyecto estás pensando y te ayudo a conectarte con el equipo.';
  return {
    role: 'assistant',
    content: serviceTitle ? `${base} Veo que te interesa ${serviceTitle} — cuéntame más.` : base,
  };
}

export default function ContactModal({ open, services, preselectedService, onClose, onSelectService }: Props) {
  const selectedServiceTitle = preselectedService !== null ? services[preselectedService]?.title ?? null : null;

  const [messages, setMessages] = useState<ChatTurn[]>([greeting(selectedServiceTitle)]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lead, setLead] = useState<CapturedLead | null>(null);
  const [call, setCall] = useState<ScheduledCall | null>(null);
  const [phoneSaved, setPhoneSaved] = useState<string | null>(null);
  // Identifies this chat session so the backend can save/append the full transcript in Supabase.
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  // "Agenda una llamada de 30 min" — a small, self-contained booking flow that calls
  // the n8n workflow directly (no LLM involved), independent of the chat panel.
  // Steps: day (pick a day) -> hour (pick a slot within that day) -> form (name/email) -> confirmed.
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedSlots, setSchedSlots] = useState<ScheduledCall[] | null>(null);
  const [schedLoadStatus, setSchedLoadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [schedLoadError, setSchedLoadError] = useState<string | null>(null);
  const [schedSelectedDay, setSchedSelectedDay] = useState<string | null>(null);
  const [schedSelectedSlot, setSchedSelectedSlot] = useState<ScheduledCall | null>(null);
  const [schedMessage, setSchedMessage] = useState('');
  const [schedName, setSchedName] = useState('');
  const [schedEmail, setSchedEmail] = useState('');
  const [schedCompany, setSchedCompany] = useState('');
  const [schedStatus, setSchedStatus] = useState<'idle' | 'confirming' | 'error'>('idle');
  const [schedError, setSchedError] = useState<string | null>(null);
  const [schedResult, setSchedResult] = useState<ScheduledCall | null>(null);
  const [otroActive, setOtroActive] = useState(false);

  // Reset the conversation whenever the modal is (re-)opened.
  useEffect(() => {
    if (open) {
      setMessages([greeting(selectedServiceTitle)]);
      setInput('');
      setSending(false);
      setError(null);
      setLead(null);
      setCall(null);
      setPhoneSaved(null);
      setConversationId(crypto.randomUUID());
      setSchedOpen(false);
      setSchedSlots(null);
      setSchedLoadStatus('idle');
      setSchedLoadError(null);
      setSchedSelectedDay(null);
      setSchedSelectedSlot(null);
      setSchedMessage('');
      setSchedName('');
      setSchedEmail('');
      setSchedCompany('');
      setSchedStatus('idle');
      setSchedError(null);
      setSchedResult(null);
      setOtroActive(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetches the open slots (no personal data needed yet) and opens the day/hour picker.
  async function openScheduler() {
    setSchedOpen(true);
    if (schedSlots || schedLoadStatus === 'loading') return;
    setSchedLoadStatus('loading');
    setSchedLoadError(null);
    try {
      const res = await fetch(`${API_URL}/api/schedule-call/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Error ${res.status}`);
      }
      const slots = (data.slots as ScheduledCall[]) || [];
      if (slots.length === 0) throw new Error('No hay horarios disponibles en los próximos días. Escríbenos a sofimh1197@gmail.com.');
      setSchedSlots(slots);
      setSchedLoadStatus('idle');
    } catch (err) {
      setSchedLoadStatus('error');
      setSchedLoadError(err instanceof Error ? err.message : 'No se pudo consultar la disponibilidad.');
    }
  }

  // Slots grouped by day, in the order the backend returned them ("lunes 17 de agosto a las 10:00 am" -> day + hour).
  const schedDayGroups: { day: string; slots: ScheduledCall[] }[] = [];
  for (const slot of schedSlots ?? []) {
    const [day] = slot.humanLabel.split(' a las ');
    const group = schedDayGroups.find((g) => g.day === day);
    if (group) group.slots.push(slot);
    else schedDayGroups.push({ day, slots: [slot] });
  }

  // Which service the scheduled call is about — the same pill selection used for the chat panel,
  // so choosing a pill (or "Otro") before/while booking carries through to the confirmation email.
  const schedServiceValue = otroActive ? 'Otro' : selectedServiceTitle;

  async function confirmBooking(e: FormEvent) {
    e.preventDefault();
    if (!schedSelectedSlot || !schedMessage.trim() || !schedName.trim() || !schedEmail.trim() || schedStatus === 'confirming') return;
    setSchedStatus('confirming');
    setSchedError(null);
    try {
      const res = await fetch(`${API_URL}/api/schedule-call/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schedName.trim(),
          email: schedEmail.trim(),
          start: schedSelectedSlot.start,
          end: schedSelectedSlot.end,
          message: schedMessage.trim(),
          service: schedServiceValue,
          company: schedCompany.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Error ${res.status}`);
      }
      setSchedResult({ ...schedSelectedSlot, meetLink: data.meetLink ?? null });
      setSchedStatus('idle');
    } catch (err) {
      setSchedStatus('error');
      setSchedError(err instanceof Error ? err.message : 'No se pudo agendar la llamada.');
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  if (!open) return null;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const next = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(next);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, conversationId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Error ${res.status}`);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply as string }]);
      if (data.leadCaptured) {
        setLead(data.leadCaptured as CapturedLead);
      }
      if (data.callScheduled) {
        setCall(data.callScheduled as ScheduledCall);
      }
      if (data.phoneSaved) {
        setPhoneSaved(data.phoneSaved as string);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo contactar al asistente.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const otroTemplate = 'Tengo una necesidad distinta a estos servicios — ';
  const pillTemplate = (title: string) => `Me interesa el servicio de ${title}. `;

  // True while the input still holds one of our auto-filled templates (or is empty) — safe to
  // overwrite when the person switches pills. False once they've typed their own text, so we
  // never clobber something they actually wrote.
  function isAutoFilled(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (text === otroTemplate) return true;
    return services.some((s) => text === pillTemplate(s.title));
  }

  function handlePill(id: number) {
    onSelectService(id);
    setOtroActive(false);
    const title = services[id]?.title;
    if (title) setInput((prev) => (isAutoFilled(prev) ? pillTemplate(title) : prev));
  }

  function handleOtro() {
    setOtroActive(true);
    setInput((prev) => (isAutoFilled(prev) ? otroTemplate : prev));
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(10,10,12,0.8)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sk-contact-grid"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 860,
          maxHeight: '88vh',
          overflow: 'auto',
          borderRadius: 24,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#1c1c24',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
        }}
      >
        <button onClick={onClose} className="sk-contact-close" aria-label="Cerrar">
          ✕
        </button>

        <div className="sk-contact-col" style={{ padding: '52px 40px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(14px)', display: 'flex', flexDirection: 'column', gap: 30, justifyContent: 'center' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 11, opacity: 0.65, marginBottom: 14 }}>
              Contacto
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>Hablemos de tu proyecto.</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9C93F0" strokeWidth="1.5" style={{ marginTop: 2, flexShrink: 0 }}>
                <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                <path d="M3 7l9 6 9-6"></path>
              </svg>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 10, opacity: 0.5, marginBottom: 4 }}>Email</div>
                <div style={{ color: '#F6F1EC', fontSize: 14 }}>sofimh1197@gmail.com</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2A8C6" strokeWidth="1.5" style={{ marginTop: 2, flexShrink: 0 }}>
                <path d="M12 21s-7-6.5-7-11.5A7 7 0 0 1 19 9.5C19 14.5 12 21 12 21z"></path>
                <circle cx="12" cy="9.5" r="2.3"></circle>
              </svg>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 10, opacity: 0.5, marginBottom: 4 }}>Estudio</div>
                <div style={{ color: '#F6F1EC', fontSize: 14 }}>Remoto</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A8C7F0" strokeWidth="1.5" style={{ marginTop: 2, flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="17" rx="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="16" y1="2" x2="16" y2="6"></line>
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 10, opacity: 0.5, marginBottom: 4 }}>¿Prefieres hablar?</div>

                {schedResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ color: '#F6F1EC', fontSize: 13, lineHeight: 1.5 }}>
                      📅 <strong>Llamada agendada</strong> — {schedResult.humanLabel}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                      Te llegará una invitación con enlace de Google Meet a {schedEmail}.
                    </div>
                    {schedResult.meetLink && (
                      <a href={schedResult.meetLink} target="_blank" rel="noreferrer" className="sk-footer-link" style={{ fontSize: 12 }}>
                        Ver enlace de Google Meet →
                      </a>
                    )}
                  </div>
                ) : schedSelectedSlot ? (
                  // Step 3: what they need + name + email, then confirm the chosen day/hour.
                  <form onSubmit={confirmBooking} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <div style={{ color: '#F6F1EC', fontSize: 12.5 }}>{schedSelectedSlot.humanLabel}</div>
                    <textarea
                      placeholder="Cuéntanos qué necesitas construir…"
                      value={schedMessage}
                      onChange={(e) => setSchedMessage(e.target.value)}
                      className="sk-input"
                      rows={2}
                      style={{ padding: '9px 12px', fontSize: 13, resize: 'none' }}
                      autoFocus
                      required
                    />
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      value={schedName}
                      onChange={(e) => setSchedName(e.target.value)}
                      className="sk-input"
                      style={{ padding: '9px 12px', fontSize: 13 }}
                      required
                    />
                    <input
                      type="email"
                      placeholder="Tu email"
                      value={schedEmail}
                      onChange={(e) => setSchedEmail(e.target.value)}
                      className="sk-input"
                      style={{ padding: '9px 12px', fontSize: 13 }}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Tu compañía (opcional)"
                      value={schedCompany}
                      onChange={(e) => setSchedCompany(e.target.value)}
                      className="sk-input"
                      style={{ padding: '9px 12px', fontSize: 13 }}
                    />
                    {schedError && <div style={{ color: '#F2A8C6', fontSize: 11 }}>{schedError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="submit"
                        disabled={schedStatus === 'confirming' || !schedMessage.trim() || !schedName.trim() || !schedEmail.trim()}
                        className="sk-btn-primary"
                        style={{ border: 'none', padding: '8px 16px', fontSize: 12.5 }}
                      >
                        {schedStatus === 'confirming' ? 'Agendando…' : 'Confirmar llamada'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSchedSelectedSlot(null)}
                        className="sk-footer-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, padding: '8px 4px' }}
                      >
                        ← Cambiar hora
                      </button>
                    </div>
                  </form>
                ) : schedSelectedDay ? (
                  // Step 2: pick an hour within the chosen day.
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto' }} className="sk-scroll">
                      {(schedDayGroups.find((g) => g.day === schedSelectedDay)?.slots ?? []).map((slot) => (
                        <button key={slot.start} type="button" onClick={() => setSchedSelectedSlot(slot)} className="sk-slot-btn">
                          {slot.humanLabel.split(' a las ')[1]}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSchedSelectedDay(null)}
                      className="sk-footer-link"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '2px 0', alignSelf: 'flex-start' }}
                    >
                      ← Cambiar día
                    </button>
                  </div>
                ) : schedSlots ? (
                  // Step 1: pick a day.
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }} className="sk-scroll">
                      {schedDayGroups.map((group) => (
                        <button
                          key={group.day}
                          type="button"
                          onClick={() => setSchedSelectedDay(group.day)}
                          className="sk-slot-btn"
                          style={{ textTransform: 'capitalize' }}
                        >
                          {group.day}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSchedOpen(false)}
                      className="sk-footer-link"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '2px 0', alignSelf: 'flex-start' }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : schedOpen ? (
                  // Loading (or failed to load) the available days/hours.
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {schedLoadStatus === 'error' ? (
                      <>
                        <div style={{ color: '#F2A8C6', fontSize: 12 }}>{schedLoadError}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" onClick={openScheduler} className="sk-btn-primary" style={{ border: 'none', padding: '8px 16px', fontSize: 12.5 }}>
                            Reintentar
                          </button>
                          <button
                            type="button"
                            onClick={() => setSchedOpen(false)}
                            className="sk-footer-link"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, padding: '8px 4px' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5 }}>Buscando horarios disponibles…</div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openScheduler}
                    className="sk-calendly-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                  >
                    Agenda una llamada de 30 min →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="sk-contact-col" style={{ padding: '32px 32px 24px', background: '#1c1c24', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 480 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 10, opacity: 0.55 }}>
              ¿En qué te ayudamos?
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {services.map((s) => (
                <button type="button" key={s.id} onClick={() => handlePill(s.id)} className={pillClass(!otroActive && preselectedService === s.id)}>
                  {s.title}
                </button>
              ))}
              <button type="button" onClick={handleOtro} className={pillClass(otroActive)}>
                Otro
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="sk-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 2px' }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: 14,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  ...(m.role === 'user'
                    ? { background: 'linear-gradient(90deg,#9C93F0,#F2A8C6,#A8C7F0)', color: '#14141a', borderBottomRightRadius: 4 }
                    : { background: 'rgba(255,255,255,0.05)', color: '#F6F1EC', borderBottomLeftRadius: 4 }),
                }}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', color: 'rgba(246,241,236,0.5)', fontSize: 13.5, borderBottomLeftRadius: 4 }}>
                Escribiendo…
              </div>
            )}
            {lead && !call && !phoneSaved && (
              <div style={{ alignSelf: 'center', fontSize: 11, color: '#A8C7F0', textAlign: 'center', padding: '4px 10px' }}>
                ✓ Contacto registrado — te escribiremos a {lead.email}
              </div>
            )}
            {phoneSaved && !call && (
              <div style={{ alignSelf: 'center', fontSize: 11, color: '#A8C7F0', textAlign: 'center', padding: '4px 10px' }}>
                ✓ Teléfono guardado — te contactaremos al {phoneSaved}
              </div>
            )}
            {call && (
              <div
                style={{
                  alignSelf: 'center',
                  fontSize: 12,
                  color: '#14141a',
                  textAlign: 'center',
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg,#9C93F0,#F2A8C6,#A8C7F0)',
                  fontWeight: 600,
                }}
              >
                📅 Llamada agendada — {call.humanLabel}
              </div>
            )}
          </div>

          {error && <div style={{ color: '#F2A8C6', fontSize: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje…"
              rows={2}
              disabled={sending}
              className="sk-input sk-textarea"
              style={{ flex: 1, resize: 'none' }}
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={sending || !input.trim()}
              className="sk-btn-primary"
              style={{ border: 'none', padding: '13px 20px', flexShrink: 0 }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
