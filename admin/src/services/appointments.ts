import { supabase } from '../lib/supabase';
import { asError } from './errors';
import type { Appointment, AppointmentStatus } from '../types/crm';

const SELECT_WITH_CONTACT = '*, contact:contacts(id, full_name, company_name, email, phone)';

export async function listAppointments(filter: {
  status?: AppointmentStatus[];
  from?: string;
  to?: string;
} = {}): Promise<Appointment[]> {
  let query = supabase.from('appointments').select(SELECT_WITH_CONTACT);
  if (filter.status && filter.status.length > 0) query = query.in('status', filter.status);
  if (filter.from) query = query.gte('starts_at', filter.from);
  if (filter.to) query = query.lte('starts_at', filter.to);

  const { data, error } = await query.order('starts_at', { ascending: true });
  if (error) throw asError(error, 'No se pudieron cargar las citas.');
  return (data as unknown as Appointment[]) || [];
}

export async function listAppointmentsForContact(contactId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('contact_id', contactId)
    .order('starts_at', { ascending: false });
  if (error) throw asError(error, 'No se pudieron cargar las citas.');
  return (data as Appointment[]) || [];
}

export async function getAppointment(id: string): Promise<Appointment> {
  const { data, error } = await supabase.from('appointments').select(SELECT_WITH_CONTACT).eq('id', id).single();
  if (error) throw asError(error, 'No se pudo cargar la cita.');
  return data as unknown as Appointment;
}

export async function createAppointment(input: {
  contactId: string;
  opportunityId?: string | null;
  serviceId?: string | null;
  startsAt: string;
  endsAt: string;
  timezone?: string;
}): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      contact_id: input.contactId,
      opportunity_id: input.opportunityId || null,
      service_id: input.serviceId || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      timezone: input.timezone || 'America/Mexico_City',
      status: 'scheduled',
    })
    .select('*')
    .single();
  if (error) throw asError(error, 'No se pudo crear la cita.');
  return data as Appointment;
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<void> {
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if (error) throw asError(error, 'No se pudo actualizar la cita.');
}

/** Formulario de "después de la llamada" — usa la función transaccional de
 * 003_crm_functions.sql (actualiza la cita, la oportunidad, registra actividad y, si hace
 * falta, la siguiente tarea de seguimiento — todo en una sola operación). */
export async function completeAppointment(input: {
  appointmentId: string;
  attended: boolean;
  callNotes?: string | null;
  clientProblem?: string | null;
  recommendedServiceId?: string | null;
  budgetMentioned?: string | null;
  interestLevel?: 'low' | 'medium' | 'high' | null;
  decisionExpectedAt?: string | null;
  nextStep?: string | null;
  nextContactAt?: string | null;
  needsProposal?: boolean;
  newOpportunityStatus?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('crm_complete_appointment', {
    p_appointment_id: input.appointmentId,
    p_attended: input.attended,
    p_call_notes: input.callNotes || null,
    p_client_problem: input.clientProblem || null,
    p_recommended_service_id: input.recommendedServiceId || null,
    p_budget_mentioned: input.budgetMentioned || null,
    p_interest_level: input.interestLevel || null,
    p_decision_expected_at: input.decisionExpectedAt || null,
    p_next_step: input.nextStep || null,
    p_next_contact_at: input.nextContactAt || null,
    p_needs_proposal: input.needsProposal ?? false,
    p_new_opportunity_status: input.newOpportunityStatus || null,
  });
  if (error) throw asError(error, 'No se pudo registrar el resultado de la llamada.');
}
