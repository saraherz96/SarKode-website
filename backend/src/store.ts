import { randomUUID } from 'node:crypto';
import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { supabase } from './supabase';

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.jsonl');

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Lenient on purpose — accepts digits with spaces, dashes, parens and an optional leading "+",
// covering local and international formats without rejecting real numbers over formatting.
export const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

export type LeadStatus = 'nuevo' | 'contactado' | 'en_progreso' | 'ganado' | 'perdido';

export interface LeadRecord {
  id: string;
  name: string;
  email: string;
  message: string;
  service: string | null;
  /** Only set once the person tells the chat they'd rather be contacted by phone than book a call. */
  phone: string | null;
  source: 'form' | 'chat' | 'schedule-link';
  status: LeadStatus;
  receivedAt: string;
}

/** Local fallback so a lead is never silently lost while Supabase isn't configured (or errors out). */
async function persistLeadLocal(record: LeadRecord): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(CONTACTS_FILE, JSON.stringify(record) + '\n', 'utf8');
}

/** Best-effort — posts the lead to the n8n workflow that emails sofimh1197@gmail.com. Never
 * throws into the caller: a slow/failing notification should never block saving the lead itself. */
async function notifyNewLead(lead: LeadRecord): Promise<void> {
  const webhookUrl = process.env.N8N_LEAD_NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) return;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: lead.name,
      email: lead.email,
      message: lead.message,
      service: lead.service,
      phone: lead.phone,
      source: lead.source,
      receivedAt: lead.receivedAt,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`n8n respondió ${res.status}`);
  }
}

/** Persists a lead (contact form, chat capture_lead, or a booked call) to Supabase — falling back to
 * the local contacts.jsonl file if Supabase isn't configured or the insert fails — then fires off
 * (without waiting) the email notification to sofimh1197@gmail.com. */
export async function persistLead(
  record: Omit<LeadRecord, 'id' | 'receivedAt' | 'status' | 'phone'> & { phone?: string | null },
): Promise<LeadRecord> {
  const full: LeadRecord = {
    id: randomUUID(),
    receivedAt: new Date().toISOString(),
    status: 'nuevo',
    ...record,
    phone: record.phone ?? null,
  };

  if (supabase) {
    const { error } = await supabase.from('leads').insert({
      id: full.id,
      name: full.name,
      email: full.email,
      message: full.message,
      service: full.service,
      phone: full.phone,
      source: full.source,
      status: full.status,
      received_at: full.receivedAt,
    });
    if (error) {
      console.error('[store] error guardando lead en Supabase, usando respaldo local:', error.message);
      await persistLeadLocal(full);
    }
  } else {
    await persistLeadLocal(full);
  }

  void notifyNewLead(full).catch((err) => {
    console.error('[store] error enviando aviso de nuevo contacto:', err instanceof Error ? err.message : err);
  });

  return full;
}

/** Best-effort upsert of a chat session's full transcript. `leadId` is only included in the
 * payload when non-null, so a later turn without a captured lead doesn't clobber one set earlier
 * in the same conversation. No-ops when Supabase isn't configured. */
export async function upsertConversation(input: {
  id: string;
  leadId: string | null;
  messages: unknown[];
  service?: string | null;
}): Promise<void> {
  if (!supabase) return;

  const payload: Record<string, unknown> = {
    id: input.id,
    messages: input.messages,
    updated_at: new Date().toISOString(),
  };
  if (input.leadId) payload.lead_id = input.leadId;
  if (input.service) payload.service = input.service;

  const { error } = await supabase.from('conversations').upsert(payload);
  if (error) {
    console.error('[store] error guardando conversación en Supabase:', error.message);
  }
}

/** Guarda cada turno individualmente en `messages` (además del jsonb completo en
 * `conversations.messages`, que se conserva tal cual para no romper el historial que ya lee el
 * chat) — así el CRM conserva el contexto turno por turno del agente de IA, en vez de un solo
 * bloque de texto. Solo inserta los turnos nuevos de esta llamada (el último mensaje del
 * usuario, si lo hay, y la respuesta del agente) — el resto ya se insertó en llamadas previas
 * de la misma conversación. No-op cuando Supabase no está configurado. */
export async function appendMessages(input: {
  conversationId: string;
  turns: { role: 'client' | 'ai_agent'; content: string }[];
}): Promise<void> {
  if (!supabase || input.turns.length === 0) return;

  const rows = input.turns.map((t) => ({
    conversation_id: input.conversationId,
    sender_role: t.role,
    content: t.content,
    channel: 'chat_widget',
  }));
  const { error } = await supabase.from('messages').insert(rows);
  if (error) {
    console.error('[store] error guardando mensajes individuales:', error.message);
  }
}

/** Called when, in the chat, someone who already went through capture_lead says they'd rather
 * be contacted by phone than book a call. Attaches the phone number to their most recent lead
 * row (matched by email) instead of creating a duplicate — then re-fires the notification email
 * so sofimh1197@gmail.com sees the phone number too. Falls back to a fresh local record when
 * Supabase isn't configured, since there's no reliable row to update in the jsonl file. */
export async function attachPhoneToLead(input: { name: string; email: string; phone: string }): Promise<LeadRecord | null> {
  const email = input.email.trim();
  const phone = input.phone.trim();

  if (supabase) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('email', email)
      .order('received_at', { ascending: false })
      .limit(1);
    if (error) {
      console.error('[store] error buscando lead para asociar teléfono:', error.message);
      return null;
    }
    const row = data?.[0] as Record<string, unknown> | undefined;
    if (!row) {
      // No previous lead for this email (shouldn't normally happen — capture_lead runs first) —
      // save it as its own lead so the phone number is never lost.
      return persistLead({ name: input.name.trim(), email, message: `Prefiere que el equipo lo/la contacte al teléfono ${phone}.`, service: null, phone, source: 'chat' });
    }
    const { error: updateError } = await supabase.from('leads').update({ phone }).eq('id', row.id as string);
    if (updateError) {
      console.error('[store] error guardando teléfono en Supabase:', updateError.message);
      return null;
    }
    const updated: LeadRecord = {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      message: row.message as string,
      service: (row.service as string | null) ?? null,
      phone,
      source: row.source as LeadRecord['source'],
      status: row.status as LeadStatus,
      receivedAt: row.received_at as string,
    };
    void notifyNewLead(updated).catch((err) => {
      console.error('[store] error enviando aviso de teléfono:', err instanceof Error ? err.message : err);
    });
    return updated;
  }

  return persistLead({ name: input.name.trim(), email, message: `Prefiere que el equipo lo/la contacte al teléfono ${phone}.`, service: null, phone, source: 'chat' });
}
