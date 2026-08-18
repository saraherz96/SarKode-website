import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPayments, updatePaymentStatus } from '../services/payments';
import type { Payment, PaymentStatus, PaymentType } from '../types/crm';
import { formatCurrency, formatDate } from '../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../components/States';

const TYPE_LABELS: Record<PaymentType, string> = { deposit: 'Anticipo', partial: 'Pago parcial', final: 'Liquidación' };
const STATUS_OPTIONS: { value: PaymentStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'refunded', label: 'Reembolsado' },
];

export default function Payments() {
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listPayments({ status: status || undefined }).then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [status]);

  const totalConfirmed = items.filter((p) => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-sk-text">Pagos</h1>
          <p className="text-sm text-sk-muted">Anticipos, pagos parciales y liquidaciones.</p>
        </div>
        <p className="text-sm text-sk-green">Total confirmado: {formatCurrency(totalConfirmed)}</p>
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
      {!loading && !error && items.length === 0 && <EmptyState title="Sin pagos" />}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-sk-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sk-border text-left text-xs text-sk-muted">
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-sk-border last:border-0 hover:bg-sk-panel-hover">
                  <td className="px-4 py-3">
                    {p.opportunity?.contact && (
                      <Link to={`/contacts/${p.opportunity.contact.id}`} className="text-sk-text hover:text-sk-purple">
                        {p.opportunity.contact.full_name}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sk-muted">{TYPE_LABELS[p.payment_type]}</td>
                  <td className="px-4 py-3 text-sk-text">{formatCurrency(p.amount, p.currency)}</td>
                  <td className="px-4 py-3 text-sk-muted">{p.payment_method || '—'}</td>
                  <td className="px-4 py-3 text-sk-muted">{formatDate(p.paid_at)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      onChange={(e) => updatePaymentStatus(p.id, e.target.value as PaymentStatus).then(load)}
                      className="rounded-md border border-sk-border bg-sk-bg px-2 py-1 text-xs"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="rejected">Rechazado</option>
                      <option value="refunded">Reembolsado</option>
                    </select>
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
