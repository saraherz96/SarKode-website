import { useEffect, useState } from 'react';
import { listConversations, listMessages } from '../../services/conversations';
import type { Conversation, CrmMessage } from '../../types/crm';
import { formatDateTime } from '../../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../States';

const ROLE_LABEL: Record<CrmMessage['sender_role'], string> = {
  client: 'Cliente',
  ai_agent: 'Agente IA',
  team: 'Equipo',
};

function MessagesList({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<CrmMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMessages(conversationId).then(setMessages).finally(() => setLoading(false));
  }, [conversationId]);

  if (loading) return <LoadingState label="Cargando mensajes…" />;
  if (messages.length === 0) return <p className="text-xs text-sk-muted-2 py-2">Sin mensajes individuales registrados.</p>;

  return (
    <div className="space-y-2 pt-2">
      {messages.map((m) => (
        <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.sender_role === 'client' ? 'bg-sk-bg' : 'bg-sk-purple/10'}`}>
          <div className="flex justify-between text-[11px] text-sk-muted-2 mb-1">
            <span>{ROLE_LABEL[m.sender_role]}</span>
            <span>{formatDateTime(m.created_at)}</span>
          </div>
          <p className="text-sk-text whitespace-pre-wrap">{m.content}</p>
        </div>
      ))}
    </div>
  );
}

export function ConversationsTab({ contactId }: { contactId: string }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listConversations({ contactId }).then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [contactId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (items.length === 0) return <EmptyState title="Sin conversaciones" description="Las sesiones del chat del sitio aparecerán aquí." />;

  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div key={c.id} className="rounded-xl border border-sk-border bg-sk-panel p-4">
          <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="w-full flex items-center justify-between gap-2 text-left">
            <div>
              <p className="text-sm text-sk-text">
                {c.channel === 'chat_widget' ? 'Chat del sitio' : c.channel} — {c.status === 'open' ? 'abierta' : 'cerrada'}
              </p>
              <p className="text-xs text-sk-muted-2">Actualizada {formatDateTime(c.updated_at)}</p>
            </div>
            <span className="text-sk-muted text-xs">{expanded === c.id ? 'Ocultar' : 'Ver mensajes'}</span>
          </button>
          {expanded === c.id && <MessagesList conversationId={c.id} />}
        </div>
      ))}
    </div>
  );
}
