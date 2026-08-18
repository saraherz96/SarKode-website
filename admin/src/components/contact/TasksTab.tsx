import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { listTasks, createTask, updateTaskStatus } from '../../services/tasks';
import type { CrmTask } from '../../types/crm';
import { formatDateTime, isOverdue } from '../../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../States';
import { OverdueTag } from '../Badges';

export function TasksTab({ contactId }: { contactId: string }) {
  const [items, setItems] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');

  function load() {
    setLoading(true);
    setError(null);
    listTasks({ contactId }).then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [contactId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask({ contactId, title: title.trim(), dueAt: dueAt ? new Date(dueAt).toISOString() : null });
    setTitle('');
    setDueAt('');
    load();
  }

  async function toggleDone(task: CrmTask) {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    await updateTaskStatus(task.id, next);
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nueva tarea…"
          className="min-w-48 flex-1 rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm"
        />
        <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm" />
        <button type="submit" className="rounded-lg bg-sk-purple text-sk-bg text-sm px-4 py-1.5">
          Agregar
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState title="Sin tareas" />
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-sk-border bg-sk-panel p-3">
              <label className="flex items-center gap-3 flex-1 min-w-0">
                <input type="checkbox" checked={t.status === 'completed'} onChange={() => toggleDone(t)} />
                <span className={`text-sm truncate ${t.status === 'completed' ? 'line-through text-sk-muted-2' : 'text-sk-text'}`}>{t.title}</span>
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
