import { supabase } from '../lib/supabase';
import { asError } from './errors';
import type { Activity, ActivityType } from '../types/crm';

export async function listActivities(filter: { contactId?: string; opportunityId?: string }): Promise<Activity[]> {
  let query = supabase.from('activities').select('*');
  if (filter.contactId) query = query.eq('contact_id', filter.contactId);
  if (filter.opportunityId) query = query.eq('opportunity_id', filter.opportunityId);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw asError(error, 'No se pudieron cargar las actividades.');
  return (data as Activity[]) || [];
}

export async function createActivity(input: {
  contactId?: string | null;
  opportunityId?: string | null;
  type: ActivityType;
  title: string;
  description?: string | null;
}): Promise<void> {
  const { data: session } = await supabase.auth.getUser();
  const { error } = await supabase.from('activities').insert({
    contact_id: input.contactId || null,
    opportunity_id: input.opportunityId || null,
    activity_type: input.type,
    title: input.title,
    description: input.description || null,
    created_by: session.user?.id || null,
  });
  if (error) throw asError(error, 'No se pudo registrar la actividad.');
}
