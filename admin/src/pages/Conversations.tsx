import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listConversations, listMessages } from '../services/conversations';
import type { Conversation, CrmMessage } from '../types/crm';
import { formatDateTime } from '../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../components/States';

export default function Conversations() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<CrmMessage[]>([]);

  function load() {
    setLoading(true);
    setError(null);
    listConversations().then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggle(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    setMessages(await listMessages(id));
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-sk-text">Conversaciones</h1>
        <p className="text-sm text-sk-muted">Sesiones del chat del sitio y otros canales.</p>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <EmptyState title="Sin conversaciones todavía" />}

      {!loading && !error && (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-xl border border-sk-border bg-sk-panel p-4">
              <button onClick={() => toggle(c.id)} className="w-full flex items-center justify-between gap-2 text-left">
                <div>
                  {c.contact ? (
                    <Link to={`/contacts/${c.contact.id}`} onClick={(e) => e.stopPropagation()} className="text-sm text-sk-text hover:text-sk-purple">
                      {c.contact.full_name}
                    </Link>
                  ) : (
                    <p className="text-sm text-sk-text">Contacto sin capturar</p>
                  )}
                  <p className="text-xs text-sk-muted-2">
                    {c.channel} · {c.status === 'open' ? 'abierta' : 'cerrada'} · {formatDateTime(c.updated_at)}
                  </p>
                </div>
                <span className="text-xs text-sk-muted">{expanded === c.id ? 'Ocultar' : 'Ver'}</span>
              </button>
              {expanded === c.id && (
                <div className="mt-3 space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-xs text-sk-muted-2">Sin mensajes individuales.</p>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.sender_role === 'client' ? 'bg-sk-bg' : 'bg-sk-purple/10'}`}>
                        <p className="text-sk-text whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
