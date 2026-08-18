-- SarKode CRM — 002_crm_rls.sql
--
-- Row Level Security. Corre esto después de 001_crm_schema.sql.
--
-- Regla general: un visitante anónimo (rol `anon`, el que usa el sitio público) nunca tiene
-- ninguna policy sobre estas tablas → acceso cero, tal como ya pasa con `leads`/`conversations`
-- en backend/supabase/schema.sql. El backend público (formulario, chat, agendar llamada) sigue
-- escribiendo con la `service_role` key, que ignora RLS por diseño — no se toca nada de eso.
--
-- Lo nuevo: cualquier persona autenticada (`authenticated`) que además tenga un renglón activo
-- en `team_members` (el equipo de SarKode) puede leer y escribir todas las tablas del CRM desde
-- la app admin/. Así el frontend admin habla directo con Supabase (con la key `anon` + sesión de
-- login) y la base de datos es quien decide, con la política de siempre: nunca confiar solo en
-- el frontend para autorización.

-- Función helper: ¿el usuario autenticado actual es un miembro activo del equipo?
-- SECURITY DEFINER para poder consultar team_members sin recursión de RLS.
create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.id = auth.uid() and tm.is_active = true
  );
$$;

grant execute on function public.is_team_member() to authenticated, anon;

-- =========================================================================
-- team_members — cualquier miembro del equipo puede ver la lista (para los
-- selectores de "responsable"). Alta/baja de cuentas se hace desde el
-- dashboard de Supabase (Authentication → Users) + un insert manual aquí, o
-- vía service_role — no hay policy de insert/update/delete para `authenticated`.
-- =========================================================================
alter table public.team_members enable row level security;

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
  for select to authenticated
  using (public.is_team_member());

-- =========================================================================
-- Tablas de solo-lectura de referencia (servicios).
-- =========================================================================
alter table public.services enable row level security;

drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select to authenticated
  using (public.is_team_member());

-- =========================================================================
-- Tablas CRUD completas para el equipo: contacts, opportunities, appointments,
-- activities, tasks, proposals, payments, pipeline_history, messages.
-- =========================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'contacts', 'opportunities', 'appointments', 'activities', 'tasks',
    'proposals', 'payments', 'pipeline_history', 'messages'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I_team_select on public.%I;', t, t);
    execute format(
      'create policy %I_team_select on public.%I for select to authenticated using (public.is_team_member());',
      t, t
    );

    execute format('drop policy if exists %I_team_insert on public.%I;', t, t);
    execute format(
      'create policy %I_team_insert on public.%I for insert to authenticated with check (public.is_team_member());',
      t, t
    );

    execute format('drop policy if exists %I_team_update on public.%I;', t, t);
    execute format(
      'create policy %I_team_update on public.%I for update to authenticated using (public.is_team_member()) with check (public.is_team_member());',
      t, t
    );

    execute format('drop policy if exists %I_team_delete on public.%I;', t, t);
    execute format(
      'create policy %I_team_delete on public.%I for delete to authenticated using (public.is_team_member());',
      t, t
    );
  end loop;
end;
$$;

-- =========================================================================
-- leads / conversations (tablas legadas, ya tenían RLS activado sin policies —
-- ver backend/supabase/schema.sql). Se agrega acceso de solo-lectura + edición
-- de status para el equipo, sin tocar el acceso de `anon`/`service_role`.
-- =========================================================================
drop policy if exists leads_team_select on public.leads;
create policy leads_team_select on public.leads
  for select to authenticated
  using (public.is_team_member());

drop policy if exists leads_team_update on public.leads;
create policy leads_team_update on public.leads
  for update to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

drop policy if exists conversations_team_select on public.conversations;
create policy conversations_team_select on public.conversations
  for select to authenticated
  using (public.is_team_member());

drop policy if exists conversations_team_update on public.conversations;
create policy conversations_team_update on public.conversations
  for update to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());
