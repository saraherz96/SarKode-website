import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { listOpportunitiesForContact } from '../../services/opportunities';
import { listPayments, createPayment, getOpportunityPaymentSummary } from '../../services/payments';
import type { Opportunity, OpportunityPaymentSummary, Payment, PaymentType } from '../../types/crm';
import { formatCurrency, formatDate } from '../../lib/format';
import { LoadingState, ErrorState, EmptyState } from '../States';

const TYPE_LABELS: Record<PaymentType, string> = { deposit: 'Anticipo', partial: 'Pago parcial', final: 'Liquidación' };

export function PaymentsTab({ contactId }: { contactId: string }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summaries, setSummaries] = useState<Record<string, OpportunityPaymentSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [opportunityId, setOpportunityId] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('deposit');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const opps = (await listOpportunitiesForContact(contactId)).filter((o) => o.status !== 'lost');
      setOpportunities(opps);
      const [allPayments, allSummaries] = await Promise.all([
        Promise.all(opps.map((o) => listPayments({ opportunityId: o.id }))).then((r) => r.flat()),
        Promise.all(opps.map((o) => getOpportunityPaymentSummary(o.id))),
      ]);
      setPayments(allPayments);
      const map: Record<string, OpportunityPaymentSummary> = {};
      opps.forEach((o, i) => {
        const s = allSummaries[i];
        if (s) map[o.id] = s;
      });
      setSummaries(map);
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
    if (!opportunityId || !amount) return;
    await createPayment({ opportunityId, paymentType, amount: Number(amount), paymentMethod: paymentMethod || null, reference: reference || null, status: 'confirmed' });
    setAmount('');
    setPaymentMethod('');
    setReference('');
    setShowForm(false);
    load();
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      {opportunities.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {opportunities.map((o) => {
            const s = summaries[o.id];
            if (!s || s.agreed_value <= 0) return null;
            return (
              <div key={o.id} className="rounded-xl border border-sk-border bg-sk-panel p-4 space-y-1">
                <p className="text-sm text-sk-text">{o.title}</p>
                <div className="flex justify-between text-xs text-sk-muted">
                  <span>Pagado {formatCurrency(s.total_paid, o.currency)} de {formatCurrency(s.agreed_value, o.currency)}</span>
                  <span>{s.percent_paid}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-sk-bg overflow-hidden">
                  <div className="h-full bg-sk-green" style={{ width: `${Math.min(100, s.percent_paid)}%` }} />
                </div>
                <p className="text-xs text-sk-amber">Saldo pendiente: {formatCurrency(s.balance_due, o.currency)}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-sk-muted">{payments.length} pago(s)</p>
        <button
          onClick={() => setShowForm((s) => !s)}
          disabled={opportunities.length === 0}
          className="text-xs rounded-lg border border-sk-border px-3 py-1.5 hover:bg-sk-panel-hover disabled:opacity-40"
        >
          {showForm ? 'Cancelar' : '+ Registrar pago'}
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
          <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)} className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm">
            <option value="deposit">Anticipo</option>
            <option value="partial">Pago parcial</option>
            <option value="final">Liquidación</option>
          </select>
          <input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto" className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm" />
          <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Método (transferencia, tarjeta…)" className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm" />
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referencia" className="rounded-lg border border-sk-border bg-sk-bg px-3 py-1.5 text-sm" />
          <button type="submit" className="rounded-lg bg-sk-purple text-sk-bg text-sm px-4 py-1.5 md:col-span-2">
            Registrar pago
          </button>
        </form>
      )}

      {payments.length === 0 ? (
        <EmptyState title="Sin pagos registrados" />
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-sk-border bg-sk-panel p-3 text-sm">
              <div>
                <p className="text-sk-text">{TYPE_LABELS[p.payment_type]} — {formatCurrency(p.amount, p.currency)}</p>
                <p className="text-xs text-sk-muted-2">{p.payment_method || 'Sin método'} · {formatDate(p.paid_at)}</p>
              </div>
              <span className={`text-xs ${p.status === 'confirmed' ? 'text-sk-green' : p.status === 'pending' ? 'text-sk-amber' : 'text-sk-red'}`}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
