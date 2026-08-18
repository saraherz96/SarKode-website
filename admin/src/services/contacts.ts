import { supabase } from '../lib/supabase';
import { asError } from './errors';
import type { Contact, ContactSource, OpportunityStatus } from '../types/crm';

export interface ContactListRow extends Contact {
  latest_opportunity_status: OpportunityStatus | null;
  latest_service_name: string | null;
  next_follow_up_at: string | null;
  last_activity_at: string | null;
}

export interface ListContactsParams {
  search?: string;
  source?: ContactSource | '';
  assignedTo?: string | '';
  page: number;
  pageSize: number;
  sortBy?: 'created_at' | 'full_name' | 'next_follow_up_at';
  sortDir?: 'asc' | 'desc';
}

/** Una sola consulta a `contact_list_view` (backend/supabase/migrations/006_crm_list_views.sql)
 * — sin N+1 por contacto. */
export async function listContacts(params: ListContactsParams): Promise<{ data: ContactListRow[]; count: number }> {
  const { search, source, assignedTo, page, pageSize, sortBy = 'created_at', sortDir = 'desc' } = params;

  let query = supabase.from('contact_list_view').select('*', { count: 'exact' });

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term},company_name.ilike.${term}`);
  }
  if (source) query = query.eq('source', source);
  if (assignedTo) query = query.eq('assigned_to', assignedTo);

  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to);

  if (error) throw asError(error, 'No se pudieron cargar los contactos.');
  return { data: (data as ContactListRow[]) || [], count: count || 0 };
}

export async function getContact(id: string): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, assignee:team_members(id, full_name)')
    .eq('id', id)
    .single();
  if (error) throw asError(error, 'No se pudo cargar el contacto.');
  return data as unknown as Contact;
}

export async function updateContact(id: string, patch: Partial<Contact>): Promise<void> {
  const { error } = await supabase.from('contacts').update(patch).eq('id', id);
  if (error) throw asError(error, 'No se pudo actualizar el contacto.');
}

export async function createContact(input: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  source: ContactSource;
}): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      full_name: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      company_name: input.companyName || null,
      job_title: input.jobTitle || null,
      source: input.source,
    })
    .select('*')
    .single();
  if (error) throw asError(error, 'No se pudo crear el contacto.');
  return data as Contact;
}
