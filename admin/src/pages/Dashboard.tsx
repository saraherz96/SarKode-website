import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, type DashboardStats } from '../services/dashboard';
import { listServices } from '../services/servicesCatalog';
import { listTeamMembers } from '../services/teamMembers';
import type { Service, TeamMemberRef } from '../types/crm';
import { CONTACT_SOURCE_LABELS, OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUSES } from '../types/crm';
import { formatCurrency } from '../lib/format';
import { LoadingState, ErrorState } from '../components/States';

const RANGE_OPTIONS = [
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimos 30 días', days: 30 },
  { label: 'Últimos 90 días', days: 90 },
  { label: 'Todo', days: 0 },
];

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-sk-border bg-sk-panel p-4">
      <p className="text-xs text-sk-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent || 'text-sk-text'}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [serviceId, setServiceId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');

  const [services, setServices] = useState<Service[]>([]);
  const [members, setMembers] = useState<TeamMemberRef[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listServices().then(setServices).catch(() => {});
    listTeamMembers().then(setMembers).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    const since = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;
    getDashboardStats({ since, serviceId: serviceId || null, assignedTo: assignedTo || null, source: source || null, status: status || null })
      .then(setStats)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [days, serviceId, assignedTo, source, status]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-sk-text">Dashboard</h1>
        <p className="text-sm text-sk-muted">Vista general del ciclo comercial de SarKode.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text"
        >
          {RANGE_OPTIONS.map((r) => (
            <option key={r.days} value={r.days}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text"
        >
          <option value="">Todos los servicios</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text"
        >
          <option value="">Todos los responsables</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text"
        >
          <option value="">Todos los orígenes</option>
          {Object.entries(CONTACT_SOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text"
        >
          <option value="">Todos los estados</option>
          {OPPORTUNITY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {OPPORTUNITY_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingState label="Calculando métricas…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            <Kpi label="Prospectos nuevos" value={String(stats.new_opportunities)} />
            <Kpi label="Pendientes de contactar" value={String(stats.pending_contact)} accent="text-sk-amber" />
            <Kpi label="Llamadas de hoy" value={String(stats.calls_today)} accent="text-sk-purple" />
            <Kpi label="Seguimientos vencidos" value={String(stats.overdue_follow_ups)} accent={stats.overdue_follow_ups > 0 ? 'text-sk-red' : undefined} />
            <Kpi label="Propuestas enviadas" value={String(stats.proposals_sent)} accent="text-sk-pink" />
            <Kpi label="Oportunidades ganadas" value={String(stats.won)} accent="text-sk-green" />
            <Kpi label="Ingresos confirmados" value={formatCurrency(stats.confirmed_revenue)} accent="text-sk-green" />
            <Kpi label="Saldo pendiente" value={formatCurrency(stats.balance_due)} accent="text-sk-amber" />
            <Kpi label="Conversión (ganadas/cerradas)" value={`${stats.conversion_rate}%`} />
            <Kpi label="Anticipos pendientes" value={String(stats.deposits_pending)} />
            <Kpi label="Propuestas por vencer (5 días)" value={String(stats.proposals_expiring_soon)} accent={stats.proposals_expiring_soon > 0 ? 'text-sk-amber' : undefined} />
            <Kpi label="No asistió" value={String(stats.no_shows)} />
          </div>

          {stats.overdue_follow_ups > 0 && (
            <Link
              to="/pipeline"
              className="block rounded-xl border border-sk-red/30 bg-sk-red/10 px-4 py-3 text-sm text-sk-red hover:bg-sk-red/15 transition"
            >
              Tienes {stats.overdue_follow_ups} seguimiento(s) vencido(s) — revisa el Pipeline →
            </Link>
          )}
        </>
      )}
    </div>
  );
}
