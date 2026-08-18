import { supabase } from '../supabase';

/** Best-effort — nunca lanza. Crea la tarea de seguimiento automática que dispara cada nueva
 * solicitud de contacto y cada llamada agendada. */
export async function createTask(input: {
  contactId?: string | null;
  opportunityId?: string | null;
  title: string;
  dueAt?: string | null;
  priority?: 'low' | 'medium' | 'high';
}): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from('tasks').insert({
    contact_id: input.contactId || null,
    opportunity_id: input.opportunityId || null,
    title: input.title,
    status: 'pending',
    priority: input.priority || 'medium',
    due_at: input.dueAt || null,
  });
  if (error) console.error('[crm] error creando tarea de seguimiento:', error.message);
}
