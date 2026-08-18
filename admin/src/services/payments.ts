import { supabase } from '../lib/supabase';
import { asError } from './errors';
import type { OpportunityPaymentSummary, Payment, PaymentStatus, PaymentType } from '../types/crm';

const SELECT_WITH_OPP = '*, opportunity:opportunities(id, title, contact:contacts(id, full_name, company_name))';

export async function listPayments(filter: { status?: PaymentStatus; opportunityId?: string } = {}): Promise<Payment[]> {
  let query = supabase.from('payments').select(SELECT_WITH_OPP);
  if (filter.status) query = query.eq('status', filter.status);
  if (filter.opportunityId) query = query.eq('opportunity_id', filter.opportunityId);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw asError(error, 'No se pudieron cargar los pagos.');
  return (data as unknown as Payment[]) || [];
}

export async function createPayment(input: {
  opportunityId: string;
  proposalId?: string | null;
  paymentType: PaymentType;
  amount: number;
  currency?: string;
  paymentMethod?: string | null;
  reference?: string | null;
  receiptUrl?: string | null;
  status?: PaymentStatus;
  paidAt?: string | null;
}): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      opportunity_id: input.opportunityId,
      proposal_id: input.proposalId || null,
      payment_type: input.paymentType,
      amount: input.amount,
      currency: input.currency || 'MXN',
      payment_method: input.paymentMethod || null,
      reference: input.reference || null,
      receipt_url: input.receiptUrl || null,
      status: input.status || 'confirmed',
      paid_at: input.paidAt || new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw asError(error, 'No se pudo registrar el pago.');
  return data as Payment;
}

export async function updatePaymentStatus(id: string, status: PaymentStatus): Promise<void> {
  const { error } = await supabase.from('payments').update({ status }).eq('id', id);
  if (error) throw asError(error, 'No se pudo actualizar el pago.');
}

/** Lee el saldo directamente de la vista `opportunity_payment_summary`
 * (003_crm_functions.sql) — nunca se calcula el saldo en el frontend. */
export async function getOpportunityPaymentSummary(opportunityId: string): Promise<OpportunityPaymentSummary | null> {
  const { data, error } = await supabase
    .from('opportunity_payment_summary')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .maybeSingle();
  if (error) throw asError(error, 'No se pudo calcular el saldo.');
  return data as OpportunityPaymentSummary | null;
}
