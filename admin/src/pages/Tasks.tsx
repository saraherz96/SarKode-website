import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTasks, updateTaskStatus } from '../services/tasks';
import type { CrmTask, TaskStatus } from '../types/crm';
import { formatDateTime, isOverdue } from '../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { OverdueTag } from '../components/Badges';

const FILTERS: { label: string; statuses: TaskStatus[] }[] = [
  { label: 'Pendientes', statuses: ['pending', 'in_progress'] },
  { label: 'Completadas', statuses: ['completed'] },
  { label: 'Canceladas', statuses: ['cancelled'] },
];

export default function Tasks() {
  const [filter, setFilter] = useState(0);
  const [items, setItems] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listTasks({ status: FILTERS[filter].statuses }).then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [filter]);

  async function toggleDone(task: CrmTask) {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    await updateTaskStatus(task.id, next);
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-sk-text">Tareas</h1>
        <p className="text-sm text-sk-muted">Seguimientos pendientes de todo el equipo.</p>
      </div>

      <div className="flex gap-1">
        {FILTERS.map((f, i) => (
          <button key={f.label} onClick={() => setFilter(i)} className={`rounded-full px-3 py-1.5 text-sm transition ${filter === i ? 'bg-sk-purple/15 text-sk-purple' : 'text-sk-muted hover:bg-sk-panel-hover'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <EmptyState title="Nada por aquí" />}

      {!loading && !error && (
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-sk-border bg-sk-panel p-4">
              <label className="flex items-center gap-3 flex-1 min-w-0">
                <input type="checkbox" checked={t.status === 'completed'} onChange={() => toggleDone(t)} />
                <div className="min-w-0">
                  <p className={`text-sm truncate ${t.status === 'completed' ? 'line-through text-sk-muted-2' : 'text-sk-text'}`}>{t.title}</p>
                  {t.contact && (
                    <Link to={`/contacts/${t.contact.id}`} onClick={(e) => e.stopPropagation()} className="text-xs text-sk-muted hover:text-sk-purple">
                      {t.contact.full_name}
                    </Link>
                  )}
                </div>
              </label>
              <div className="flex items-center gap-2 shrink-0">
                {isOverdue(t.due_at) && t.status !== 'completed' && <OverdueTag />}
                <span className="text-xs text-sk-muted-2">{formatDateTime(t.due_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
