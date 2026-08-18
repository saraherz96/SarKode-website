import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { listOpportunitiesForContact, createOpportunity, changeOpportunityStatus, updateOpportunity } from '../../services/opportunities';
import { listServices } from '../../services/servicesCatalog';
import { listTeamMembers } from '../../services/teamMembers';
import type { Opportunity, Service, TeamMemberRef } from '../../types/crm';
import { OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUSES } from '../../types/crm';
import { formatCurrency, formatDate } from '../../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../States';
import { ServiceBadge } from '../Badges';

export function OpportunitiesTab({ contactId }: { contactId: string }) {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [members, setMembers] = useState<TeamMemberRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');

  function load() {
    setLoading(true);
    setError(null);
    listOpportunitiesForContact(contactId).then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [contactId]);
  useEffect(() => {
    listServices().then(setServices).catch(() => {});
    listTeamMembers().then(setMembers).catch(() => {});
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createOpportunity({
      contactId,
      title: title.trim(),
      serviceId: serviceId || null,
      estimatedValue: estimatedValue ? Number(estimatedValue) : null,
    });
    setTitle('');
    setServiceId('');
    setEstimatedValue('');
    setShowForm(false);
    load();
  }

  async function handleStatusChange(id: string, status: Opportunity['status']) {
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await changeOpportunityStatus(id, status);
  }

  async function handleAssign(id: string, assignedTo: string) {
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, assigned_to: assignedTo || null } : o)));
    await updateOpportunity(id, { assigned_to: assignedTo || null });
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-sk-muted">{items.length} oportunidad(es)</p>
        <button onClick={() => setShowForm((s) => !s)} className="text-xs rounded-lg border border-sk-border px-3 py-1.5 hover:bg-sk-panel-hover">
          {showForm ? 'Cancelar' : '+ Nueva oportunidad'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-sk-border bg-sk-panel p-4 grid gap-3 md:grid-cols-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la oportunidad"
            className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm md:col-span-3"
          />
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm">
            <option value="">Sin servicio</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="Valor estimado"
            type="number"
            className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-lg bg-sk-purple text-sk-bg text-sm px-3 py-1.5">
            Crear
          </button>
        </form>
      )}

      {items.length === 0 && !showForm && <EmptyState title="Sin oportunidades" description="Crea una para empezar a dar seguimiento." />}

      <div className="space-y-3">
        {items.map((o) => (
          <div key={o.id} className="rounded-xl border border-sk-border bg-sk-panel p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-sk-text">{o.title}</p>
              <ServiceBadge name={o.service?.name} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-sk-muted">
              <div>
                <p className="text-sk-muted-2">Valor estimado</p>
                <p className="text-sk-text">{formatCurrency(o.estimated_value, o.currency)}</p>
              </div>
              <div>
                <p className="text-sk-muted-2">Próximo seguimiento</p>
                <p className="text-sk-text">{formatDate(o.next_follow_up_at)}</p>
              </div>
              <div>
                <p className="text-sk-muted-2">Cierre esperado</p>
                <p className="text-sk-text">{formatDate(o.expected_close_date)}</p>
              </div>
              <div>
                <p className="text-sk-muted-2">Creada</p>
                <p className="text-sk-text">{formatDate(o.created_at)}</p>
              </div>
            </div>
            {o.client_needs && <p className="text-xs text-sk-muted">Necesita: {o.client_needs}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <select
                value={o.status}
                onChange={(e) => handleStatusChange(o.id, e.target.value as Opportunity['status'])}
                className="rounded-md border border-sk-border bg-sk-bg px-2 py-1 text-xs"
              >
                {OPPORTUNITY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {OPPORTUNITY_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                value={o.assigned_to || ''}
                onChange={(e) => handleAssign(o.id, e.target.value)}
                className="rounded-md border border-sk-border bg-sk-bg px-2 py-1 text-xs"
              >
                <option value="">Sin asignar</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
