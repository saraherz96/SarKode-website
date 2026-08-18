import { supabase } from '../supabase';
import { findOrCreateContact } from './contacts';
import { resolveServiceId } from './services';
import { findOrCreateOpportunity } from './opportunities';
import { logActivity } from './activities';
import { createTask } from './tasks';
import { createAppointment } from './appointments';
import type { ContactSource } from './types';

/** Si la solicitud vino del chat (hay `conversationId`), enlaza esa conversación con el
 * contacto/oportunidad recién resueltos — así aparece en la ficha del contacto en vez de solo
 * en `conversations.lead_id`. Best-effort. */
async function linkConversation(conversationId: string | null | undefined, contactId: string, opportunityId?: string | null) {
  if (!supabase || !conversationId) return;
  const { error } = await supabase
    .from('conversations')
    .update({ contact_id: contactId, opportunity_id: opportunityId || null })
    .eq('id', conversationId);
  if (error) console.error('[crm] error enlazando conversación:', error.message);
}

/** Orquesta el flujo "Solicitud de contacto" del CRM (ver README del proyecto): alguien deja su
 * correo o teléfono (formulario, chat, o dice que prefiere que le llamen por teléfono) y
 * pidió que el equipo la contacte. Encuentra/crea el contacto sin duplicar, crea o reutiliza
 * una oportunidad en `pending_contact`, registra la actividad y crea la tarea de seguimiento.
 * Nunca lanza — un fallo aquí no debe tumbar el guardado del lead que ya ocurrió en store.ts. */
export async function onContactRequest(input: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  service?: string | null;
  message: string;
  source: 'form' | 'chat' | 'schedule-link' | 'phone-preference';
  leadId?: string | null;
  conversationId?: string | null;
}): Promise<void> {
  try {
    const contactSource: ContactSource =
      input.source === 'form' ? 'website_form' : input.source === 'schedule-link' ? 'appointment' : 'website_chat';

    const contact = await findOrCreateContact({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      companyName: input.companyName,
      source: contactSource,
      leadId: input.leadId,
    });
    if (!contact) return;

    const serviceId = await resolveServiceId(input.service);
    const opportunity = await findOrCreateOpportunity({
      contactId: contact.id,
      serviceId,
      title: `${input.service && input.service.trim() ? input.service.trim() : 'Consulta general'} — ${input.fullName}`,
      description: input.message,
      clientNeeds: input.message,
      status: 'pending_contact',
      leadId: input.leadId,
      conversationId: input.conversationId,
    });

    await linkConversation(input.conversationId, contact.id, opportunity?.id);

    await logActivity({
      contactId: contact.id,
      opportunityId: opportunity?.id,
      type: 'contact_created',
      title: 'Nueva solicitud de contacto',
      description: input.message,
      metadata: { source: input.source },
    });

    await createTask({
      contactId: contact.id,
      opportunityId: opportunity?.id,
      title: `Primer contacto — ${input.fullName}`,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      priority: 'high',
    });
  } catch (err) {
    console.error('[crm] error en onContactRequest:', err instanceof Error ? err.message : err);
  }
}

/** Orquesta el flujo "Agendamiento de llamada": crea/reutiliza contacto y oportunidad
 * (`call_scheduled`), y guarda la cita como un renglón real en `appointments` — con el Event ID
 * de Google Calendar y el enlace de Meet — algo que antes no se persistía en ningún lado.
 * Nunca lanza. */
export async function onCallScheduled(input: {
  fullName: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  service?: string | null;
  summary: string;
  startsAt: string;
  endsAt: string;
  googleMeetUrl?: string | null;
  googleCalendarEventId?: string | null;
  leadId?: string | null;
  conversationId?: string | null;
}): Promise<void> {
  try {
    const contact = await findOrCreateContact({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      companyName: input.companyName,
      source: 'appointment',
      leadId: input.leadId,
    });
    if (!contact) return;

    const serviceId = await resolveServiceId(input.service);
    const opportunity = await findOrCreateOpportunity({
      contactId: contact.id,
      serviceId,
      title: `${input.service && input.service.trim() ? input.service.trim() : 'Consulta general'} — ${input.fullName}`,
      description: input.summary,
      clientNeeds: input.summary,
      status: 'call_scheduled',
      leadId: input.leadId,
      conversationId: input.conversationId,
    });

    await linkConversation(input.conversationId, contact.id, opportunity?.id);

    await createAppointment({
      contactId: contact.id,
      opportunityId: opportunity?.id,
      serviceId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      googleMeetUrl: input.googleMeetUrl,
      googleCalendarEventId: input.googleCalendarEventId,
    });

    await logActivity({
      contactId: contact.id,
      opportunityId: opportunity?.id,
      type: 'appointment_scheduled',
      title: 'Llamada agendada',
      description: input.summary,
      metadata: { startsAt: input.startsAt },
    });
  } catch (err) {
    console.error('[crm] error en onCallScheduled:', err instanceof Error ? err.message : err);
  }
}
