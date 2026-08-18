import { supabase } from '../lib/supabase';
import { asError } from './errors';
import type { Opportunity, OpportunityStatus, PipelineHistoryEntry } from '../types/crm';

const SELECT_WITH_JOINS =
  '*, contact:contacts(id, full_name, company_name, email, phone), service:services(id, name, slug), assignee:team_members(id, full_name)';

export interface PipelineFilters {
  serviceId?: string;
  assignedTo?: string;
  search?: string;
}

/** Trae todas las oportunidades activas (no ganadas/perdidas) con su contacto/servicio/
 * responsable ya resueltos en la misma consulta — el tablero Kanban no dispara una consulta
 * por tarjeta. */
export async function listPipeline(filters: PipelineFilters = {}): Promise<Opportunity[]> {
  let query = supabase.from('opportunities').select(SELECT_WITH_JOINS).not('status', 'in', '(won,lost)');

  if (filters.serviceId) query = query.eq('service_id', filters.serviceId);
  if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
  if (filters.search && filters.search.trim()) {
    query = query.ilike('title', `%${filters.search.trim()}%`);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw asError(error, 'No se pudo cargar el pipeline.');
  return (data as unknown as Opportunity[]) || [];
}

export async function listOpportunitiesForContact(contactId: string): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(SELECT_WITH_JOINS)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });
  if (error) throw asError(error, 'No se pudieron cargar las oportunidades.');
  return (data as unknown as Opportunity[]) || [];
}

export async function getOpportunity(id: string): Promise<Opportunity> {
  const { data, error } = await supabase.from('opportunities').select(SELECT_WITH_JOINS).eq('id', id).single();
  if (error) throw asError(error, 'No se pudo cargar la oportunidad.');
  return data as unknown as Opportunity;
}

export async function createOpportunity(input: {
  contactId: string;
  serviceId?: string | null;
  title: string;
  description?: string | null;
  clientNeeds?: string | null;
  estimatedValue?: number | null;
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string | null;
}): Promise<Opportunity> {
  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      contact_id: input.contactId,
      service_id: input.serviceId || null,
      title: input.title,
      description: input.description || null,
      client_needs: input.clientNeeds || null,
      estimated_value: input.estimatedValue ?? null,
      priority: input.priority || 'medium',
      assigned_to: input.assignedTo || null,
      status: 'new',
    })
    .select(SELECT_WITH_JOINS)
    .single();
  if (error) throw asError(error, 'No se pudo crear la oportunidad.');
  return data as unknown as Opportunity;
}

export async function updateOpportunity(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('opportunities').update(patch).eq('id', id);
  if (error) throw asError(error, 'No se pudo actualizar la oportunidad.');
}

/** Cambia la etapa vía la función transaccional de 003_crm_functions.sql — actualiza la
 * oportunidad, registra pipeline_history y crea una actividad, todo o nada. Úsalo siempre en
 * vez de un UPDATE directo sobre `status`. */
export async function changeOpportunityStatus(id: string, newStatus: OpportunityStatus, notes?: string): Promise<void> {
  const { error } = await supabase.rpc('crm_change_opportunity_status', {
    p_opportunity_id: id,
    p_new_status: newStatus,
    p_notes: notes || null,
  });
  if (error) throw asError(error, 'No se pudo cambiar la etapa.');
}

export async function listPipelineHistory(opportunityId: string): Promise<PipelineHistoryEntry[]> {
  const { data, error } = await supabase
    .from('pipeline_history')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false });
  if (error) throw asError(error, 'No se pudo cargar el historial de pipeline.');
  return (data as PipelineHistoryEntry[]) || [];
}
