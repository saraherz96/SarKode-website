// Tipos TypeScript que reflejan el esquema de backend/supabase/migrations/*.sql. Este proyecto
// no usa el CLI de Supabase (no hay supabase/config.toml para `supabase gen types`), así que se
// mantienen a mano — cualquier cambio de columnas en las migraciones debe reflejarse aquí.

export type OpportunityStatus =
  | 'new'
  | 'pending_contact'
  | 'contacted'
  | 'call_scheduled'
  | 'call_completed'
  | 'proposal_pending'
  | 'proposal_sent'
  | 'negotiation'
  | 'deposit_pending'
  | 'in_progress'
  | 'final_payment_pending'
  | 'won'
  | 'lost'
  | 'no_response';

export const OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  'new',
  'pending_contact',
  'contacted',
  'call_scheduled',
  'call_completed',
  'proposal_pending',
  'proposal_sent',
  'negotiation',
  'deposit_pending',
  'in_progress',
  'final_payment_pending',
  'won',
  'lost',
  'no_response',
];

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  new: 'Nueva',
  pending_contact: 'Por contactar',
  contacted: 'Contactado',
  call_scheduled: 'Llamada agendada',
  call_completed: 'Llamada realizada',
  proposal_pending: 'Por cotizar',
  proposal_sent: 'Propuesta enviada',
  negotiation: 'Negociación',
  deposit_pending: 'Anticipo pendiente',
  in_progress: 'En ejecución',
  final_payment_pending: 'Liquidación pendiente',
  won: 'Ganada',
  lost: 'Perdida',
  no_response: 'Sin respuesta',
};

/** Columnas del Kanban — subconjunto/orden de OPPORTUNITY_STATUSES pensado para el tablero
 * visual (ganada/perdida se muestran aparte, no como columnas activas). */
export const PIPELINE_COLUMNS: OpportunityStatus[] = [
  'new',
  'pending_contact',
  'contacted',
  'call_scheduled',
  'call_completed',
  'proposal_pending',
  'proposal_sent',
  'negotiation',
  'deposit_pending',
  'in_progress',
  'final_payment_pending',
];

export type ContactSource = 'website_form' | 'website_chat' | 'appointment' | 'whatsapp' | 'referral' | 'event' | 'manual';

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  website_form: 'Formulario del sitio',
  website_chat: 'Chat del sitio',
  appointment: 'Agendó llamada',
  whatsapp: 'WhatsApp',
  referral: 'Referido',
  event: 'Evento',
  manual: 'Manual',
};

export interface TeamMemberRef {
  id: string;
  full_name: string;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
}

export interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  job_title: string | null;
  preferred_contact_channel: 'email' | 'phone' | 'whatsapp' | null;
  source: ContactSource;
  assigned_to: string | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
  assignee?: TeamMemberRef | null;
}

export interface Opportunity {
  id: string;
  contact_id: string;
  service_id: string | null;
  title: string;
  description: string | null;
  client_needs: string | null;
  status: OpportunityStatus;
  priority: 'low' | 'medium' | 'high';
  estimated_value: number | null;
  proposal_value: number | null;
  currency: string;
  probability: number | null;
  assigned_to: string | null;
  next_action: string | null;
  next_follow_up_at: string | null;
  expected_close_date: string | null;
  lost_reason: string | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  contact?: Contact;
  service?: Service | null;
  assignee?: TeamMemberRef | null;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  rescheduled: 'Reprogramada',
  no_show: 'No asistió',
};

export interface Appointment {
  id: string;
  contact_id: string;
  opportunity_id: string | null;
  service_id: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: AppointmentStatus;
  google_calendar_event_id: string | null;
  google_meet_url: string | null;
  attended: boolean | null;
  client_problem: string | null;
  recommended_service_id: string | null;
  budget_mentioned: string | null;
  interest_level: 'low' | 'medium' | 'high' | null;
  decision_expected_at: string | null;
  next_step: string | null;
  next_contact_at: string | null;
  needs_proposal: boolean;
  call_notes: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact;
}

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

export interface Activity {
  id: string;
  contact_id: string | null;
  opportunity_id: string | null;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface CrmTask {
  id: string;
  contact_id: string | null;
  opportunity_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  due_at: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  contact?: Contact | null;
  opportunity?: Opportunity | null;
}

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface Proposal {
  id: string;
  opportunity_id: string;
  proposal_number: string;
  description: string | null;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: ProposalStatus;
  file_url: string | null;
  sent_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
  opportunity?: Opportunity;
}

export type PaymentType = 'deposit' | 'partial' | 'final';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected' | 'refunded';

export interface Payment {
  id: string;
  opportunity_id: string;
  proposal_id: string | null;
  payment_type: PaymentType;
  amount: number;
  currency: string;
  payment_method: string | null;
  reference: string | null;
  receipt_url: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
  opportunity?: Opportunity;
}

export interface OpportunityPaymentSummary {
  opportunity_id: string;
  agreed_value: number;
  total_paid: number;
  balance_due: number;
  percent_paid: number;
}

export interface PipelineHistoryEntry {
  id: string;
  opportunity_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  channel: 'chat_widget' | 'whatsapp' | 'email' | 'phone' | 'manual';
  status: 'open' | 'closed';
  assigned_to: string | null;
  service: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact | null;
}

export interface CrmMessage {
  id: string;
  conversation_id: string;
  sender_role: 'client' | 'ai_agent' | 'team';
  sender_name: string | null;
  content: string;
  channel: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
