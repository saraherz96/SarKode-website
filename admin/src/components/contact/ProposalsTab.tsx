import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { listOpportunitiesForContact } from '../../services/opportunities';
import { listProposals, createProposal, updateProposalStatus } from '../../services/proposals';
import type { Opportunity, Proposal, ProposalStatus } from '../../types/crm';
import { formatCurrency, formatDate } from '../../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../States';

const STATUS_OPTIONS: ProposalStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
};

export function ProposalsTab({ contactId }: { contactId: string }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [opportunityId, setOpportunityId] = useState('');
  const [description, setDescription] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const opps = await listOpportunitiesForContact(contactId);
      setOpportunities(opps);
      const all = await Promise.all(opps.map((o) => listProposals({ opportunityId: o.id })));
      setProposals(all.flat());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [contactId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!opportunityId || !subtotal) return;
    await createProposal({ opportunityId, description, subtotal: Number(subtotal), expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null, fileUrl: fileUrl || null });
    setDescription('');
    setSubtotal('');
    setExpiresAt('');
    setFileUrl('');
    setShowForm(false);
    load();
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-sk-muted">{proposals.length} propuesta(s)</p>
        <button
          onClick={() => setShowForm((s) => !s)}
          disabled={opportunities.length === 0}
          className="text-xs rounded-lg border border-sk-border px-3 py-1.5 hover:bg-sk-panel-hover disabled:opacity-40"
        >
          {showForm ? 'Cancelar' : '+ Nueva propuesta'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-sk-border bg-sk-panel p-4 grid gap-3 md:grid-cols-2">
          <select required value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm md:col-span-2">
            <option value="">Selecciona la oportunidad…</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del alcance"
            className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm md:col-span-2"
            rows={2}
          />
          <input required type="number" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} placeholder="Subtotal" className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm" />
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm" title="Vence" />
          <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="URL del archivo (PDF)" className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm md:col-span-2" />
          <button type="submit" className="rounded-lg bg-sk-purple text-sk-bg text-sm px-4 py-1.5 md:col-span-2">
            Crear propuesta
          </button>
        </form>
      )}

      {proposals.length === 0 ? (
        <EmptyState title="Sin propuestas" description={opportunities.length === 0 ? 'Crea primero una oportunidad.' : undefined} />
      ) : (
        <div className="space-y-2">
          {proposals.map((p) => (
            <div key={p.id} className="rounded-xl border border-sk-border bg-sk-panel p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-sk-text">{p.proposal_number}</p>
                <select value={p.status} onChange={(e) => updateProposalStatus(p.id, e.target.value as ProposalStatus).then(load)} className="rounded-md border border-sk-border bg-sk-bg px-2 py-1 text-xs">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-lg text-sk-text">{formatCurrency(p.total, p.currency)}</p>
              {p.description && <p className="text-xs text-sk-muted">{p.description}</p>}
              <div className="flex flex-wrap gap-4 text-xs text-sk-muted-2">
                <span>Enviada: {formatDate(p.sent_at)}</span>
                <span>Vence: {formatDate(p.expires_at)}</span>
                {p.file_url && (
                  <a href={p.file_url} target="_blank" rel="noreferrer" className="text-sk-purple">
                    Ver archivo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
