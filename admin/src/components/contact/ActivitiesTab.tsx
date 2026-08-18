import { useEffect, useState } from 'react';
import { listActivities } from '../../services/activities';
import type { Activity } from '../../types/crm';
import { formatDateTime } from '../../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../States';

const TYPE_ICON: Record<Activity['activity_type'], string> = {
  contact_created: '👤',
  stage_changed: '↔',
  email_sent: '✉',
  call_made: '☎',
  note: '📝',
  proposal_sent: '📄',
  payment_recorded: '💰',
  owner_changed: '🔁',
  follow_up_done: '✅',
  appointment_scheduled: '📅',
  appointment_completed: '📞',
  task_created: '☑',
  other: '•',
};

export function ActivitiesTab({ contactId, title = 'Actividades' }: { contactId: string; title?: string }) {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listActivities({ contactId }).then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [contactId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (items.length === 0) return <EmptyState title="Sin actividad todavía" />;

  return (
    <div className="space-y-1">
      <p className="text-sm text-sk-muted mb-2">{title}</p>
      <ol className="space-y-3 border-l border-sk-border pl-4">
        {items.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-sk-purple" />
            <div className="flex items-center gap-2 text-sm text-sk-text">
              <span>{TYPE_ICON[a.activity_type]}</span>
              <span>{a.title}</span>
            </div>
            {a.description && <p className="text-xs text-sk-muted mt-0.5 whitespace-pre-wrap">{a.description}</p>}
            <p className="text-[11px] text-sk-muted-2 mt-0.5">{formatDateTime(a.created_at)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
