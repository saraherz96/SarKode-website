import { supabase } from '../supabase';
import type { CrmOpportunity, OpportunityStatus } from './types';

/** Si ya existe una oportunidad abierta (no ganada/perdida) para este contacto y este mismo
 * servicio, creada en las últimas 24h, la reutiliza en vez de crear una duplicada — cubre el
 * caso de que alguien reenvíe el formulario o vuelva a escribir en el chat por la misma
 * solicitud. Fuera de esa ventana, o para un servicio distinto, se crea una oportunidad nueva
 * (una persona puede tener varias, una por servicio que le interesa). */
async function findRecentOpenOpportunity(contactId: string, serviceId: string | null): Promise<CrmOpportunity | null> {
  if (!supabase) return null;

  let query = supabase
    .from('opportunities')
    .select('id, contact_id, status')
    .eq('contact_id', contactId)
    .not('status', 'in', '(won,lost)')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  query = serviceId ? query.eq('service_id', serviceId) : query.is('service_id', null);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[crm] error buscando oportunidad reciente:', error.message);
    return null;
  }
  return (data as CrmOpportunity | null) ?? null;
}

export async function findOrCreateOpportunity(input: {
  contactId: string;
  serviceId: string | null;
  title: string;
  description?: string | null;
  clientNeeds?: string | null;
  status: OpportunityStatus;
  leadId?: string | null;
  conversationId?: string | null;
}): Promise<CrmOpportunity | null> {
  if (!supabase) return null;

  const recent = await findRecentOpenOpportunity(input.contactId, input.serviceId);
  if (recent) {
    const { error } = await supabase
      .from('opportunities')
      .update({
        description: input.description ?? undefined,
        client_needs: input.clientNeeds ?? undefined,
        conversation_id: input.conversationId ?? undefined,
      })
      .eq('id', recent.id);
    if (error) console.error('[crm] error actualizando oportunidad reciente:', error.message);
    if (recent.status !== input.status) {
      await changeOpportunityStatus(recent.id, input.status);
    }
    return recent;
  }

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      contact_id: input.contactId,
      service_id: input.serviceId,
      title: input.title,
      description: input.description || null,
      client_needs: input.clientNeeds || null,
      status: input.status,
      lead_id: input.leadId || null,
      conversation_id: input.conversationId || null,
    })
    .select('id, contact_id, status')
    .single();

  if (error) {
    console.error('[crm] error creando oportunidad:', error.message);
    return null;
  }
  return data as CrmOpportunity;
}

/** Usa la función transaccional de 003_crm_functions.sql (actualiza la oportunidad + historial
 * de pipeline + actividad, todo o nada) en vez de un UPDATE suelto. */
export async function changeOpportunityStatus(opportunityId: string, newStatus: OpportunityStatus, notes?: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('crm_change_opportunity_status', {
    p_opportunity_id: opportunityId,
    p_new_status: newStatus,
    p_notes: notes || null,
  });
  if (error) console.error('[crm] error cambiando etapa de la oportunidad:', error.message);
}
