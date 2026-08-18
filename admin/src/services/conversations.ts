import { supabase } from '../lib/supabase';
import { asError } from './errors';
import type { Conversation, CrmMessage } from '../types/crm';

export async function listConversations(filter: { contactId?: string } = {}): Promise<Conversation[]> {
  let query = supabase.from('conversations').select('*, contact:contacts(id, full_name, company_name)');
  if (filter.contactId) query = query.eq('contact_id', filter.contactId);

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw asError(error, 'No se pudieron cargar las conversaciones.');
  return (data as unknown as Conversation[]) || [];
}

export async function listMessages(conversationId: string): Promise<CrmMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw asError(error, 'No se pudieron cargar los mensajes.');
  return (data as CrmMessage[]) || [];
}
