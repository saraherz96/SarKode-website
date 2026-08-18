import { supabase } from '../supabase';

export type ActivityType =
  | 'contact_created'
  | 'stage_changed'
  | 'email_sent'
  | 'call_made'
  | 'note'
  | 'proposal_sent'
  | 'payment_recorded'
  | 'owner_changed'
  | 'follow_up_done'
  | 'appointment_scheduled'
  | 'appointment_completed'
  | 'task_created'
  | 'other';

/** Best-effort — nunca lanza, para no tumbar el flujo público (formulario/chat/agendar) si
 * falla el registro de actividad. */
export async function logActivity(input: {
  contactId?: string | null;
  opportunityId?: string | null;
  type: ActivityType;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!supabase) return;
  if (!input.contactId && !input.opportunityId) return;

  const { error } = await supabase.from('activities').insert({
    contact_id: input.contactId || null,
    opportunity_id: input.opportunityId || null,
    activity_type: input.type,
    title: input.title,
    description: input.description || null,
    metadata: input.metadata || {},
  });
  if (error) console.error('[crm] error registrando actividad:', error.message);
}
