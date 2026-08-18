import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { listAppointmentsForContact, completeAppointment, updateAppointmentStatus } from '../../services/appointments';
import { listServices } from '../../services/servicesCatalog';
import type { Appointment, Service } from '../../types/crm';
import { APPOINTMENT_STATUS_LABELS } from '../../types/crm';
import { formatDateTime } from '../../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../States';

function CallOutcomeForm({ appointment, services, onDone }: { appointment: Appointment; services: Service[]; onDone: () => void }) {
  const [attended, setAttended] = useState(true);
  const [clientProblem, setClientProblem] = useState(appointment.client_problem || '');
  const [recommendedServiceId, setRecommendedServiceId] = useState(appointment.recommended_service_id || '');
  const [budgetMentioned, setBudgetMentioned] = useState(appointment.budget_mentioned || '');
  const [interestLevel, setInterestLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [decisionExpectedAt, setDecisionExpectedAt] = useState('');
  const [nextStep, setNextStep] = useState(appointment.next_step || '');
  const [nextContactAt, setNextContactAt] = useState('');
  const [needsProposal, setNeedsProposal] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [newStatus, setNewStatus] = useState('call_completed');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await completeAppointment({
        appointmentId: appointment.id,
        attended,
        callNotes: callNotes || null,
        clientProblem: clientProblem || null,
        recommendedServiceId: recommendedServiceId || null,
        budgetMentioned: budgetMentioned || null,
        interestLevel,
        decisionExpectedAt: decisionExpectedAt || null,
        nextStep: nextStep || null,
        nextContactAt: nextContactAt ? new Date(nextContactAt).toISOString() : null,
        needsProposal,
        newOpportunityStatus: attended ? newStatus : 'no_response',
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg border border-sk-border bg-sk-bg p-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={attended} onChange={(e) => setAttended(e.target.checked)} />
        La llamada se realizó
      </label>

      {attended && (
        <>
          <textarea
            value={clientProblem}
            onChange={(e) => setClientProblem(e.target.value)}
            placeholder="Problema o necesidad del cliente"
            className="w-full rounded-lg border border-sk-border bg-sk-panel px-3 py-2 text-sm"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={recommendedServiceId} onChange={(e) => setRecommendedServiceId(e.target.value)} className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm">
              <option value="">Servicio recomendado</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              value={budgetMentioned}
              onChange={(e) => setBudgetMentioned(e.target.value)}
              placeholder="Presupuesto mencionado"
              className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm"
            />
            <select value={interestLevel} onChange={(e) => setInterestLevel(e.target.value as typeof interestLevel)} className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm">
              <option value="low">Interés bajo</option>
              <option value="medium">Interés medio</option>
              <option value="high">Interés alto</option>
            </select>
            <input
              type="date"
              value={decisionExpectedAt}
              onChange={(e) => setDecisionExpectedAt(e.target.value)}
              className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm"
              title="Fecha estimada de decisión"
            />
          </div>
          <input
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            placeholder="Próximo paso"
            className="w-full rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm"
          />
          <input
            type="datetime-local"
            value={nextContactAt}
            onChange={(e) => setNextContactAt(e.target.value)}
            className="w-full rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm"
            title="Próxima fecha de contacto"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={needsProposal} onChange={(e) => setNeedsProposal(e.target.checked)} />
            Necesita preparar una propuesta
          </label>
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm">
            <option value="call_completed">Llamada realizada</option>
            <option value="proposal_pending">Por cotizar</option>
            <option value="negotiation">Negociación</option>
            <option value="lost">Perdida</option>
          </select>
        </>
      )}

      <textarea
        value={callNotes}
        onChange={(e) => setCallNotes(e.target.value)}
        placeholder="Notas privadas"
        className="w-full rounded-lg border border-sk-border bg-sk-panel px-3 py-2 text-sm"
        rows={2}
      />

      <button type="submit" disabled={saving} className="rounded-lg bg-sk-purple text-sk-bg text-sm px-4 py-1.5 disabled:opacity-50">
        {saving ? 'Guardando…' : 'Guardar resultado'}
      </button>
    </form>
  );
}

export function AppointmentsTab({ contactId }: { contactId: string }) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openOutcomeFor, setOpenOutcomeFor] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listAppointmentsForContact(contactId).then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [contactId]);
  useEffect(() => {
    listServices().then(setServices).catch(() => {});
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (items.length === 0) return <EmptyState title="Sin citas" description="Las llamadas agendadas por el sitio aparecerán aquí." />;

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="rounded-xl border border-sk-border bg-sk-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-sk-text">{formatDateTime(a.starts_at)}</p>
              <p className="text-xs text-sk-muted-2">{APPOINTMENT_STATUS_LABELS[a.status]}</p>
            </div>
            <div className="flex gap-2">
              {a.google_meet_url && (
                <a href={a.google_meet_url} target="_blank" rel="noreferrer" className="text-xs rounded-lg border border-sk-border px-3 py-1.5 hover:bg-sk-panel-hover">
                  Google Meet
                </a>
              )}
              {(a.status === 'scheduled' || a.status === 'confirmed') && (
                <>
                  <button
                    onClick={() => updateAppointmentStatus(a.id, 'confirmed').then(load)}
                    className="text-xs rounded-lg border border-sk-border px-3 py-1.5 hover:bg-sk-panel-hover"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => updateAppointmentStatus(a.id, 'cancelled').then(load)}
                    className="text-xs rounded-lg border border-sk-border px-3 py-1.5 hover:bg-sk-panel-hover"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setOpenOutcomeFor(openOutcomeFor === a.id ? null : a.id)}
                    className="text-xs rounded-lg bg-sk-purple/15 text-sk-purple px-3 py-1.5"
                  >
                    Registrar resultado
                  </button>
                </>
              )}
            </div>
          </div>
          {a.call_notes && <p className="mt-2 text-xs text-sk-muted">{a.call_notes}</p>}
          {openOutcomeFor === a.id && (
            <CallOutcomeForm
              appointment={a}
              services={services}
              onDone={() => {
                setOpenOutcomeFor(null);
                load();
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
