import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { listActivities } from '../../services/activities';
import type { Activity } from '../../types/crm';
import { formatDateTime } from '../../lib/format';
import { LoadingState, EmptyState } from '../States';

export function NotesTab({ contactId, onAdd }: { contactId: string; onAdd: (text: string) => Promise<void> }) {
  const [notes, setNotes] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    listActivities({ contactId })
      .then((items) => setNotes(items.filter((a) => a.activity_type === 'note')))
      .finally(() => setLoading(false));
  }

  useEffect(load, [contactId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    await onAdd(text.trim());
    setText('');
    setSaving(false);
    load();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Agregar una nota interna…"
          className="w-full rounded-lg border border-sk-border bg-sk-panel px-3 py-2 text-sm"
          rows={3}
        />
        <button type="submit" disabled={saving} className="rounded-lg bg-sk-purple text-sk-bg text-sm px-4 py-1.5 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar nota'}
        </button>
      </form>

      {loading ? (
        <LoadingState />
      ) : notes.length === 0 ? (
        <EmptyState title="Sin notas todavía" />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-sk-border bg-sk-panel p-3">
              <p className="text-sm text-sk-text whitespace-pre-wrap">{n.description}</p>
              <p className="text-[11px] text-sk-muted-2 mt-1">{formatDateTime(n.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
