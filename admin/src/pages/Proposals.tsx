import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProposals } from '../services/proposals';
import type { Proposal, ProposalStatus } from '../types/crm';
import { formatCurrency, formatDate, isOverdue } from '../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../components/States';

const STATUS_OPTIONS: { value: ProposalStatus | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviada' },
  { value: 'accepted', label: 'Aceptada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'expired', label: 'Vencida' },
];

export default function Proposals() {
  const [status, setStatus] = useState<ProposalStatus | ''>('');
  const [items, setItems] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listProposals({ status: status || undefined }).then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [status]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-sk-text">Propuestas</h1>
        <p className="text-sm text-sk-muted">Cotizaciones enviadas a los contactos.</p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {STATUS_OPTIONS.map((o) => (
          <button key={o.value} onClick={() => setStatus(o.value)} className={`rounded-full px-3 py-1.5 text-sm transition ${status === o.value ? 'bg-sk-purple/15 text-sk-purple' : 'text-sk-muted hover:bg-sk-panel-hover'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <EmptyState title="Sin propuestas" />}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-sk-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sk-border text-left text-xs text-sk-muted">
                <th className="px-4 py-3 font-medium">Folio</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Enviada</th>
                <th className="px-4 py-3 font-medium">Vence</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-sk-border last:border-0 hover:bg-sk-panel-hover">
                  <td className="px-4 py-3 text-sk-text">{p.proposal_number}</td>
                  <td className="px-4 py-3">
                    {p.opportunity?.contact && (
                      <Link to={`/contacts/${p.opportunity.contact.id}`} className="text-sk-text hover:text-sk-purple">
                        {p.opportunity.contact.full_name}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sk-text">{formatCurrency(p.total, p.currency)}</td>
                  <td className="px-4 py-3 text-sk-muted capitalize">{p.status}</td>
                  <td className="px-4 py-3 text-sk-muted">{formatDate(p.sent_at)}</td>
                  <td className="px-4 py-3">
                    <span className={isOverdue(p.expires_at) && p.status === 'sent' ? 'text-sk-red' : 'text-sk-muted'}>{formatDate(p.expires_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
