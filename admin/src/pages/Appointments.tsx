import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAppointments } from '../services/appointments';
import type { Appointment, AppointmentStatus } from '../types/crm';
import { APPOINTMENT_STATUS_LABELS } from '../types/crm';
import { formatDateTime, isOverdue } from '../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../components/States';

const GROUPS: { label: string; statuses: AppointmentStatus[] }[] = [
  { label: 'Próximas', statuses: ['scheduled', 'confirmed'] },
  { label: 'Realizadas', statuses: ['completed'] },
  { label: 'Canceladas', statuses: ['cancelled'] },
  { label: 'Reprogramadas', statuses: ['rescheduled'] },
  { label: 'No asistió', statuses: ['no_show'] },
];

export default function Appointments() {
  const [group, setGroup] = useState(0);
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listAppointments({ status: GROUPS[group].statuses })
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [group]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-sk-text">Citas</h1>
        <p className="text-sm text-sk-muted">Llamadas agendadas vía el sitio, Google Calendar y Google Meet.</p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setGroup(i)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${group === i ? 'bg-sk-purple/15 text-sk-purple' : 'text-sk-muted hover:bg-sk-panel-hover'}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <EmptyState title="Sin citas en esta categoría" />}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-2">
          {items.map((a) => (
            <Link
              key={a.id}
              to={`/contacts/${a.contact_id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-sk-border bg-sk-panel p-4 hover:bg-sk-panel-hover transition"
            >
              <div>
                <p className="text-sm text-sk-text">{a.contact?.full_name || 'Contacto'}</p>
                <p className="text-xs text-sk-muted-2">{a.contact?.company_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-sk-text">{formatDateTime(a.starts_at)}</p>
                <p className="text-xs text-sk-muted-2">{APPOINTMENT_STATUS_LABELS[a.status]}</p>
              </div>
              {isOverdue(a.starts_at) && a.status === 'scheduled' && <span className="text-xs text-sk-red">Pasada sin confirmar</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
