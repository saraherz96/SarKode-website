-- SarKode CRM — 001_crm_schema.sql
--
-- Agrega el módulo de CRM interno sobre el esquema existente (backend/supabase/schema.sql:
-- tablas `leads` y `conversations`). No borra ni renombra nada de lo que ya existe — solo
-- agrega tablas nuevas y columnas nuevas (con ADD COLUMN IF NOT EXISTS) a `conversations`.
--
-- Orden de ejecución (pega y corre cada archivo, en este orden, en el SQL Editor de Supabase):
--   1. 001_crm_schema.sql   (este archivo — tablas, columnas, índices, triggers)
--   2. 002_crm_rls.sql      (Row Level Security)
--   3. 003_crm_functions.sql (funciones/transacciones: cambio de etapa, folio de propuesta, resumen de pagos)
--   4. 004_crm_backfill.sql  (opcional pero recomendado — trae los leads existentes al CRM)
--   5. 005_crm_seed_demo.sql (OPCIONAL — solo en un proyecto de Supabase de desarrollo/staging, nunca en producción)
--
-- Todo es idempotente (create table if not exists / add column if not exists), así que es
-- seguro volver a correr un archivo si algo falla a la mitad.

-- =========================================================================
-- team_members — el equipo de SarKode. Un renglón por usuario de Supabase
-- Auth que tiene acceso al CRM. `assigned_to` en las demás tablas apunta aquí.
-- Se crea manualmente un renglón por cada persona después de invitarla desde
-- Authentication → Users en el dashboard de Supabase (ver README).
-- =========================================================================
create table if not exists public.team_members (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'sales' check (role in ('admin', 'sales', 'ops')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- services — los 4 servicios reales de SarKode (frontend/src/data/services.ts).
-- Sembrada por 004_crm_backfill.sql / documentada abajo — no inventes servicios nuevos.
-- =========================================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- contacts — una persona o empresa. Único por email y por teléfono (índices
-- parciales más abajo) para que el mismo contacto nunca se duplique aunque
-- tenga varias oportunidades.
-- =========================================================================
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  company_name text,
  job_title text,
  preferred_contact_channel text check (preferred_contact_channel in ('email', 'phone', 'whatsapp')),
  source text not null default 'manual'
    check (source in ('website_form', 'website_chat', 'appointment', 'whatsapp', 'referral', 'event', 'manual')),
  assigned_to uuid references public.team_members(id) on delete set null,
  -- Trazabilidad hacia el lead legado que originó este contacto (si aplica). No se usa para
  -- lógica de negocio, solo para poder auditar/backfill.
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_email_or_phone check (email is not null or phone is not null)
);

-- Deduplicación real a nivel de base de datos (además de la lógica de "buscar antes de
-- crear" en el backend): un mismo email o teléfono no puede repetirse entre contactos.
create unique index if not exists contacts_email_unique_idx
  on public.contacts (lower(trim(email))) where email is not null;
create unique index if not exists contacts_phone_unique_idx
  on public.contacts (regexp_replace(phone, '[^0-9]', '', 'g')) where phone is not null;

create index if not exists contacts_assigned_to_idx on public.contacts (assigned_to);
create index if not exists contacts_created_at_idx on public.contacts (created_at desc);

-- =========================================================================
-- opportunities — un servicio que un contacto está considerando. Un contacto
-- puede tener varias.
-- =========================================================================
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  title text not null,
  description text,
  client_needs text,
  status text not null default 'new' check (status in (
    'new', 'pending_contact', 'contacted', 'call_scheduled', 'call_completed',
    'proposal_pending', 'proposal_sent', 'negotiation', 'deposit_pending',
    'in_progress', 'final_payment_pending', 'won', 'lost', 'no_response'
  )),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  estimated_value numeric(12, 2),
  proposal_value numeric(12, 2),
  currency text not null default 'MXN',
  probability smallint check (probability between 0 and 100),
  assigned_to uuid references public.team_members(id) on delete set null,
  next_action text,
  next_follow_up_at timestamptz,
  expected_close_date date,
  lost_reason text,
  -- Trazabilidad hacia el lead legado (si esta oportunidad vino de un `leads` existente).
  lead_id uuid references public.leads(id) on delete set null,
  conversation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists opportunities_contact_id_idx on public.opportunities (contact_id);
create index if not exists opportunities_status_idx on public.opportunities (status);
create index if not exists opportunities_assigned_to_idx on public.opportunities (assigned_to);
create index if not exists opportunities_next_follow_up_idx on public.opportunities (next_follow_up_at);

-- =========================================================================
-- conversations — se reutiliza la tabla existente (backend/supabase/schema.sql), solo se
-- le agregan las columnas que le faltan para relacionarla con el CRM. `lead_id` y
-- `messages` (jsonb) se conservan tal cual para no romper backend/src/store.ts.
-- =========================================================================
alter table public.conversations add column if not exists contact_id uuid references public.contacts(id) on delete set null;
alter table public.conversations add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;
alter table public.conversations add column if not exists channel text not null default 'chat_widget'
  check (channel in ('chat_widget', 'whatsapp', 'email', 'phone', 'manual'));
alter table public.conversations add column if not exists status text not null default 'open' check (status in ('open', 'closed'));
alter table public.conversations add column if not exists assigned_to uuid references public.team_members(id) on delete set null;

create index if not exists conversations_contact_id_idx on public.conversations (contact_id);
create index if not exists conversations_opportunity_id_idx on public.conversations (opportunity_id);

-- Ahora que existe, conecta el `conversation_id` de opportunities.
alter table public.opportunities
  drop constraint if exists opportunities_conversation_id_fkey;
alter table public.opportunities
  add constraint opportunities_conversation_id_fkey foreign key (conversation_id)
    references public.conversations(id) on delete set null;

-- =========================================================================
-- messages — mensajes individuales de una conversación (no se reemplaza el jsonb
-- `conversations.messages`, que backend/src/store.ts sigue escribiendo tal cual;
-- esta tabla es la fuente normalizada para el CRM y hacia adelante).
-- =========================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_role text not null check (sender_role in ('client', 'ai_agent', 'team')),
  sender_name text,
  content text not null,
  channel text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages (conversation_id, created_at);

-- =========================================================================
-- appointments — llamadas agendadas. Hoy no existe ninguna tabla para esto (solo se
-- manda por correo vía n8n); esta tabla es nueva.
-- =========================================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Mexico_City',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  google_calendar_event_id text,
  google_meet_url text,
  attended boolean,
  -- Formulario de "después de la llamada" (ver brief):
  client_problem text,
  recommended_service_id uuid references public.services(id) on delete set null,
  budget_mentioned text,
  interest_level text check (interest_level in ('low', 'medium', 'high')),
  decision_expected_at date,
  next_step text,
  next_contact_at timestamptz,
  needs_proposal boolean not null default false,
  call_notes text,
  created_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_contact_id_idx on public.appointments (contact_id);
create index if not exists appointments_opportunity_id_idx on public.appointments (opportunity_id);
create index if not exists appointments_starts_at_idx on public.appointments (starts_at);
create index if not exists appointments_status_idx on public.appointments (status);

-- =========================================================================
-- activities — línea de tiempo cronológica por contacto/oportunidad.
-- =========================================================================
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  activity_type text not null check (activity_type in (
    'contact_created', 'stage_changed', 'email_sent', 'call_made', 'note',
    'proposal_sent', 'payment_recorded', 'owner_changed', 'follow_up_done',
    'appointment_scheduled', 'appointment_completed', 'task_created', 'other'
  )),
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint activities_contact_or_opportunity check (contact_id is not null or opportunity_id is not null)
);

create index if not exists activities_contact_id_idx on public.activities (contact_id, created_at desc);
create index if not exists activities_opportunity_id_idx on public.activities (opportunity_id, created_at desc);

-- =========================================================================
-- tasks — acciones pendientes de seguimiento.
-- =========================================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_at timestamptz,
  assigned_to uuid references public.team_members(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to);
create index if not exists tasks_due_at_idx on public.tasks (due_at) where status in ('pending', 'in_progress');
create index if not exists tasks_opportunity_id_idx on public.tasks (opportunity_id);

-- =========================================================================
-- proposals — cotizaciones enviadas.
-- =========================================================================
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  proposal_number text not null unique,
  description text,
  subtotal numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  currency text not null default 'MXN',
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  file_url text,
  sent_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists proposals_opportunity_id_idx on public.proposals (opportunity_id);

-- Folio incremental "SK-0001", "SK-0002", ... para proposal_number.
create sequence if not exists public.proposal_number_seq;

-- =========================================================================
-- payments — anticipos, pagos parciales y liquidaciones. Registros
-- independientes (no un booleano) para poder calcular saldo real.
-- =========================================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete set null,
  payment_type text not null check (payment_type in ('deposit', 'partial', 'final')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'MXN',
  payment_method text,
  reference text,
  receipt_url text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'refunded')),
  paid_at timestamptz,
  created_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payments_opportunity_id_idx on public.payments (opportunity_id);
create index if not exists payments_proposal_id_idx on public.payments (proposal_id);

-- =========================================================================
-- pipeline_history — cada cambio de etapa de una oportunidad.
-- =========================================================================
create table if not exists public.pipeline_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references public.team_members(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_history_opportunity_id_idx on public.pipeline_history (opportunity_id, created_at desc);

-- =========================================================================
-- updated_at automático en las tablas que lo tienen.
-- =========================================================================
create or replace function public.crm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at before update on public.contacts
  for each row execute function public.crm_set_updated_at();

drop trigger if exists trg_opportunities_updated_at on public.opportunities;
create trigger trg_opportunities_updated_at before update on public.opportunities
  for each row execute function public.crm_set_updated_at();

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at before update on public.appointments
  for each row execute function public.crm_set_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at before update on public.conversations
  for each row execute function public.crm_set_updated_at();
