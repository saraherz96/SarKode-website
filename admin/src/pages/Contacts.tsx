import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listContacts, type ContactListRow } from '../services/contacts';
import type { ContactSource } from '../types/crm';
import { CONTACT_SOURCE_LABELS, OPPORTUNITY_STATUS_LABELS } from '../types/crm';
import { formatDate, isOverdue } from '../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { OverdueTag } from '../components/Badges';

const PAGE_SIZE = 20;

export default function Contacts() {
  const [rows, setRows] = useState<ContactListRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<ContactSource | ''>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'full_name' | 'next_follow_up_at'>('created_at');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listContacts({ search, source: source || undefined, page, pageSize: PAGE_SIZE, sortBy })
      .then(({ data, count }) => {
        setRows(data);
        setCount(count);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, source, sortBy]);
  useEffect(() => {
    setPage(0);
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-sk-text">Contactos</h1>
        <p className="text-sm text-sk-muted">{count} contacto(s)</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email, teléfono o empresa…"
          className="min-w-64 rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text placeholder:text-sk-muted-2"
        />
        <select value={source} onChange={(e) => setSource(e.target.value as ContactSource | '')} className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text">
          <option value="">Todos los orígenes</option>
          {Object.entries(CONTACT_SOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="rounded-lg border border-sk-border bg-sk-panel px-3 py-1.5 text-sm text-sk-text">
          <option value="created_at">Más recientes</option>
          <option value="full_name">Nombre (A-Z)</option>
          <option value="next_follow_up_at">Próximo seguimiento</option>
        </select>
      </div>

      {loading && <LoadingState label="Cargando contactos…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && <EmptyState title="No hay contactos" description="Los que dejen sus datos en el sitio aparecerán aquí." />}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-sk-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sk-border text-left text-xs text-sk-muted">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Servicio</th>
                  <th className="px-4 py-3 font-medium">Origen</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Último contacto</th>
                  <th className="px-4 py-3 font-medium">Próximo seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-sk-border last:border-0 hover:bg-sk-panel-hover">
                    <td className="px-4 py-3">
                      <Link to={`/contacts/${c.id}`} className="text-sk-text hover:text-sk-purple font-medium">
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sk-muted">{c.company_name || '—'}</td>
                    <td className="px-4 py-3 text-sk-muted">{c.email || c.phone || '—'}</td>
                    <td className="px-4 py-3 text-sk-muted">{c.latest_service_name || '—'}</td>
                    <td className="px-4 py-3 text-sk-muted">{CONTACT_SOURCE_LABELS[c.source]}</td>
                    <td className="px-4 py-3 text-sk-muted">
                      {c.latest_opportunity_status ? OPPORTUNITY_STATUS_LABELS[c.latest_opportunity_status] : '—'}
                    </td>
                    <td className="px-4 py-3 text-sk-muted">{formatDate(c.last_activity_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sk-muted">{formatDate(c.next_follow_up_at)}</span>
                        {isOverdue(c.next_follow_up_at) && <OverdueTag />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-sk-muted">
            <span>
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-sk-border px-3 py-1 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-sk-border px-3 py-1 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
