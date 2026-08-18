-- SarKode — esquema de Supabase para leads (contactos/clientes) y conversaciones
-- del agente de IA. Copia y pega todo este archivo en el SQL Editor de tu
-- proyecto de Supabase (https://supabase.com/dashboard/project/_/sql) y dale
-- "Run" una sola vez.
--
-- NOTA: el módulo de CRM interno (contactos, oportunidades, pipeline, citas, propuestas,
-- pagos, etc.) se agrega encima de este esquema, sin modificarlo, en
-- backend/supabase/migrations/ — ver backend/supabase/migrations/README.md.

-- Un lead = un contacto/cliente que dejó sus datos, ya sea por el formulario,
-- el chat del agente, o al agendar una llamada.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  service text,
  -- Teléfono opcional: se llena cuando, en el chat, la persona prefiere que el equipo
  -- se comunique con ella en vez de agendar una llamada.
  phone text,
  source text not null check (source in ('form', 'chat', 'schedule-link')),
  -- Campo de seguimiento: se actualiza a mano desde el Table Editor de Supabase
  -- a medida que se contacta al cliente.
  status text not null default 'nuevo'
    check (status in ('nuevo', 'contactado', 'en_progreso', 'ganado', 'perdido')),
  received_at timestamptz not null default now()
);

-- Una conversación = el historial completo de una sesión de chat con el
-- agente. Se enlaza a un lead una vez que, dentro de esa conversación, el
-- agente captura el contacto o agenda una llamada (hasta entonces lead_id es nulo).
create table if not exists public.conversations (
  id uuid primary key,
  lead_id uuid references public.leads(id) on delete set null,
  messages jsonb not null default '[]'::jsonb,
  service text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_lead_id_idx on public.conversations (lead_id);

-- Si ya habías corrido este archivo antes (la tabla leads ya existía sin la columna
-- phone), esta línea la agrega sin romper nada. Es segura de correr las veces que sea.
alter table public.leads add column if not exists phone text;

-- RLS activado y sin policies: nadie puede leer/escribir estas tablas salvo el
-- backend, que usa la service_role key (esa key ignora RLS por diseño). El
-- frontend nunca habla directo con Supabase, así que no necesita ningún acceso.
alter table public.leads enable row level security;
alter table public.conversations enable row level security;
