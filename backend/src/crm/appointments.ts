import { supabase } from '../supabase';

/** Best-effort — nunca lanza. Guarda la cita agendada vía n8n/Google Calendar (ver
 * scheduling.ts) como un renglón real en `appointments`, algo que antes de este módulo no
 * pasaba: solo se mencionaba en el texto del lead y se mandaba por correo. */
export async function createAppointment(input: {
  contactId: string;
  opportunityId?: string | null;
  serviceId?: string | null;
  startsAt: string;
  endsAt: string;
  googleMeetUrl?: string | null;
  googleCalendarEventId?: string | null;
}): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from('appointments').insert({
    contact_id: input.contactId,
    opportunity_id: input.opportunityId || null,
    service_id: input.serviceId || null,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    status: 'scheduled',
    google_meet_url: input.googleMeetUrl || null,
    google_calendar_event_id: input.googleCalendarEventId || null,
  });
  if (error) console.error('[crm] error guardando cita:', error.message);
}
