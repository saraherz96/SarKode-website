import { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { listPipeline, changeOpportunityStatus } from '../services/opportunities';
import { listServices } from '../services/servicesCatalog';
import { listTeamMembers } from '../services/teamMembers';
import type { Opportunity, Service, TeamMemberRef } from '../types/crm';
import { OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUSES } from '../types/crm';
import { formatCurrency, formatDate, isOverdue } from '../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { ServiceBadge, OverdueTag } from '../components/Badges';

// Columnas activas del tablero — ganada/perdida se consultan desde Contactos/reportes, no
// ocupan espacio permanente en el Kanban de trabajo diario.
const BOARD_COLUMNS = OPPORTUNITY_STATUSES.filter((s) => s !== 'won' && s !== 'lost');

function OpportunityCard({
  opp,
  onChangeStatus,
}: {
  opp: Opportunity;
  onChangeStatus: (id: string, status: Opportunity['status']) => void;
}) {
  const overdue = isOverdue(opp.next_follow_up_at);
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/opportunity-id', opp.id)}
      className="rounded-xl border border-sk-border bg-sk-panel p-3 space-y-2 cursor-grab active:cursor-grabbing hover:border-sk-purple/40 transition"
    >
      <div className="flex items-start justify-between gap-2">
        <Link to={`/contacts/${opp.contact_id}`} className="text-sm font-medium text-sk-text hover:text-sk-purple truncate">
          {opp.contact?.full_name || 'Contacto'}
        </Link>
        {overdue && <OverdueTag />}
      </div>
      {opp.contact?.company_name && <p className="text-xs text-sk-muted-2 truncate">{opp.contact.company_name}</p>}
      <ServiceBadge name={opp.service?.name} />
      {opp.estimated_value != null && <p className="text-sm text-sk-text">{formatCurrency(opp.estimated_value, opp.currency)}</p>}
      {opp.next_action && <p className="text-xs text-sk-muted truncate">Próximo: {opp.next_action}</p>}
      <div className="flex items-center justify-between text-[11px] text-sk-muted-2">
        <span>{opp.next_follow_up_at ? `Seguimiento: ${formatDate(opp.next_follow_up_at)}` : 'Sin seguimiento'}</span>
        <span className="truncate">{opp.assignee?.full_name || 'Sin asignar'}</span>
      </div>
      <select
        aria-label={`Cambiar etapa de ${opp.contact?.full_name || 'oportunidad'}`}
        value={opp.status}
        onChange={(e) => onChangeStatus(opp.id, e.target.value as Opportunity['status'])}
        className="w-full rounded-md border border-sk-border bg-sk-bg px-2 py-1 text-xs text-sk-text"
      >
        {OPPORTUNITY_STATUSES.map((s) => (
          <option key={s} value={s}>
            {OPPORTUNITY_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Pipeline() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [members, setMembers] = useState<TeamMemberRef[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listServices().then(setServices).catch(() => {});
    listTeamMembers().then(setMembers).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    listPipeline({ serviceId: serviceId || undefined, assignedTo: assignedTo || undefined, search: search || undefined })
      .then(setOpportunities)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [serviceId, assignedTo]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function handleChangeStatus(id: string, status: Opportunity['status']) {
    setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await changeOpportunityStatus(id, status);
      if (status === 'won' || status === 'lost') load();
    } catch (err) {
      setError((err as Error).message);
      load();
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, status: Opportunity['status']) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/opportunity-id');
    if (id) void handleChangeStatus(id, status);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-sk-text">Pipeline</h1>
        <p className="text-sm text-sk-muted">Arrastra una tarjeta a otra columna, o usa el selector dentro de la tarjeta.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título…"
          className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text placeholder:text-sk-muted-2"
        />
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text">
          <option value="">Todos los servicios</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text">
          <option value="">Todos los responsables</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingState label="Cargando pipeline…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && opportunities.length === 0 && <EmptyState title="No hay oportunidades activas" description="Las oportunidades nuevas del sitio aparecerán aquí automáticamente." />}

      {!loading && !error && opportunities.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((status) => {
            const items = opportunities.filter((o) => o.status === status);
            return (
              <div
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, status)}
                className="w-72 shrink-0 rounded-2xl border border-sk-border bg-sk-panel/40 p-3 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-medium text-sk-text">{OPPORTUNITY_STATUS_LABELS[status]}</p>
                  <span className="text-xs text-sk-muted-2">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[40px]">
                  {items.map((opp) => (
                    <OpportunityCard key={opp.id} opp={opp} onChangeStatus={handleChangeStatus} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
