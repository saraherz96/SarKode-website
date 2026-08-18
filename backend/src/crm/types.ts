/** Tipos mínimos del lado del backend para escribir en las tablas del CRM (ver
 * backend/supabase/migrations/001_crm_schema.sql). El backend solo necesita crear/actualizar
 * registros desde los flujos públicos (formulario, chat, agendar llamada) — la lectura completa
 * y edición vive en la app admin/, que habla directo con Supabase usando RLS. */

export type ContactSource =
  | 'website_form'
  | 'website_chat'
  | 'appointment'
  | 'whatsapp'
  | 'referral'
  | 'event'
  | 'manual';

export interface CrmContact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

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

export interface CrmOpportunity {
  id: string;
  contact_id: string;
  status: OpportunityStatus;
}
