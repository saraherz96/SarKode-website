import { supabase } from '../lib/supabase';
import { asError } from './errors';
import type { Proposal, ProposalStatus } from '../types/crm';

const SELECT_WITH_OPP = '*, opportunity:opportunities(id, title, contact:contacts(id, full_name, company_name))';

export async function listProposals(filter: { status?: ProposalStatus; opportunityId?: string } = {}): Promise<Proposal[]> {
  let query = supabase.from('proposals').select(SELECT_WITH_OPP);
  if (filter.status) query = query.eq('status', filter.status);
  if (filter.opportunityId) query = query.eq('opportunity_id', filter.opportunityId);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw asError(error, 'No se pudieron cargar las propuestas.');
  return (data as unknown as Proposal[]) || [];
}

export async function getProposal(id: string): Promise<Proposal> {
  const { data, error } = await supabase.from('proposals').select(SELECT_WITH_OPP).eq('id', id).single();
  if (error) throw asError(error, 'No se pudo cargar la propuesta.');
  return data as unknown as Proposal;
}

export async function createProposal(input: {
  opportunityId: string;
  description?: string | null;
  subtotal: number;
  tax?: number;
  currency?: string;
  expiresAt?: string | null;
  fileUrl?: string | null;
}): Promise<Proposal> {
  const tax = input.tax ?? 0;
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      opportunity_id: input.opportunityId,
      description: input.description || null,
      subtotal: input.subtotal,
      tax,
      total: input.subtotal + tax,
      currency: input.currency || 'MXN',
      expires_at: input.expiresAt || null,
      file_url: input.fileUrl || null,
      status: 'draft',
    })
    .select('*')
    .single();
  if (error) throw asError(error, 'No se pudo crear la propuesta.');
  return data as Proposal;
}

export async function updateProposalStatus(id: string, status: ProposalStatus): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'sent') patch.sent_at = new Date().toISOString();
  if (status === 'accepted') patch.accepted_at = new Date().toISOString();
  const { error } = await supabase.from('proposals').update(patch).eq('id', id);
  if (error) throw asError(error, 'No se pudo actualizar la propuesta.');
}
