-- SarKode CRM — 003_crm_functions.sql
--
-- Funciones SQL para las operaciones que tocan varias tablas relacionadas a la vez (cada
-- función de Postgres corre atómicamente dentro de la transacción que la invoca, así que
-- esto cumple "usa transacciones cuando una operación actualice varias tablas"). Corre esto
-- después de 001_crm_schema.sql y 002_crm_rls.sql.

-- =========================================================================
-- Folio de propuesta: "SK-0001", "SK-0002", ...
-- =========================================================================
create or replace function public.crm_next_proposal_number()
returns text
language sql
as $$
  select 'SK-' || lpad(nextval('public.proposal_number_seq')::text, 4, '0');
$$;

alter table public.proposals
  alter column proposal_number set default public.crm_next_proposal_number();

grant execute on function public.crm_next_proposal_number() to authenticated;

-- =========================================================================
-- Cambiar la etapa de una oportunidad (usado por el Kanban, drag&drop o
-- selector): actualiza la oportunidad, registra el historial y crea una
-- actividad. Todo o nada.
-- =========================================================================
create or replace function public.crm_change_opportunity_status(
  p_opportunity_id uuid,
  p_new_status text,
  p_notes text default null
)
returns public.opportunities
language plpgsql
security invoker
as $$
declare
  v_old_status text;
  v_result public.opportunities;
begin
  select status into v_old_status from public.opportunities where id = p_opportunity_id for update;
  if not found then
    raise exception 'Oportunidad % no existe', p_opportunity_id;
  end if;

  update public.opportunities
  set
    status = p_new_status,
    closed_at = case when p_new_status in ('won', 'lost') then now() else closed_at end
  where id = p_opportunity_id
  returning * into v_result;

  insert into public.pipeline_history (opportunity_id, previous_status, new_status, changed_by, notes)
  values (p_opportunity_id, v_old_status, p_new_status, auth.uid(), p_notes);

  insert into public.activities (opportunity_id, contact_id, activity_type, title, description, created_by)
  values (
    p_opportunity_id,
    v_result.contact_id,
    'stage_changed',
    'Cambio de etapa: ' || coalesce(v_old_status, '(nueva)') || ' → ' || p_new_status,
    p_notes,
    auth.uid()
  );

  return v_result;
end;
$$;

grant execute on function public.crm_change_opportunity_status(uuid, text, text) to authenticated;

-- =========================================================================
-- Registrar el resultado de una llamada (formulario "después de la llamada"):
-- actualiza la cita, actualiza las necesidades/estado de la oportunidad,
-- registra actividad y — si cambia el estado — historial de pipeline.
-- =========================================================================
create or replace function public.crm_complete_appointment(
  p_appointment_id uuid,
  p_attended boolean,
  p_call_notes text default null,
  p_client_problem text default null,
  p_recommended_service_id uuid default null,
  p_budget_mentioned text default null,
  p_interest_level text default null,
  p_decision_expected_at date default null,
  p_next_step text default null,
  p_next_contact_at timestamptz default null,
  p_needs_proposal boolean default false,
  p_new_opportunity_status text default null
)
returns public.appointments
language plpgsql
security invoker
as $$
declare
  v_appt public.appointments;
  v_opportunity_id uuid;
begin
  update public.appointments
  set
    status = case when p_attended then 'completed' else 'no_show' end,
    attended = p_attended,
    call_notes = p_call_notes,
    client_problem = p_client_problem,
    recommended_service_id = p_recommended_service_id,
    budget_mentioned = p_budget_mentioned,
    interest_level = p_interest_level,
    decision_expected_at = p_decision_expected_at,
    next_step = p_next_step,
    next_contact_at = p_next_contact_at,
    needs_proposal = p_needs_proposal
  where id = p_appointment_id
  returning * into v_appt;

  if not found then
    raise exception 'Cita % no existe', p_appointment_id;
  end if;

  v_opportunity_id := v_appt.opportunity_id;

  if v_opportunity_id is not null then
    if p_client_problem is not null then
      update public.opportunities set client_needs = p_client_problem where id = v_opportunity_id;
    end if;
    if p_next_contact_at is not null or p_next_step is not null then
      update public.opportunities
      set
        next_follow_up_at = coalesce(p_next_contact_at, next_follow_up_at),
        next_action = coalesce(p_next_step, next_action)
      where id = v_opportunity_id;
    end if;
    if p_new_opportunity_status is not null then
      perform public.crm_change_opportunity_status(v_opportunity_id, p_new_opportunity_status, 'Resultado de la llamada registrado.');
    end if;
  end if;

  insert into public.activities (contact_id, opportunity_id, activity_type, title, description, created_by, metadata)
  values (
    v_appt.contact_id,
    v_opportunity_id,
    'appointment_completed',
    case when p_attended then 'Llamada realizada' else 'No asistió a la llamada' end,
    p_call_notes,
    auth.uid(),
    jsonb_build_object(
      'interest_level', p_interest_level,
      'budget_mentioned', p_budget_mentioned,
      'needs_proposal', p_needs_proposal
    )
  );

  if p_next_contact_at is not null then
    insert into public.tasks (contact_id, opportunity_id, title, status, priority, due_at, assigned_to)
    values (
      v_appt.contact_id,
      v_opportunity_id,
      coalesce(p_next_step, 'Dar seguimiento'),
      'pending',
      'medium',
      p_next_contact_at,
      v_appt.created_by
    );
  end if;

  return v_appt;
end;
$$;

grant execute on function public.crm_complete_appointment(
  uuid, boolean, text, text, uuid, text, text, date, text, timestamptz, boolean, text
) to authenticated;

-- =========================================================================
-- Vista de resumen financiero por oportunidad: valor acordado, total pagado
-- (solo pagos `confirmed`), saldo pendiente y % pagado. El frontend nunca
-- calcula esto — siempre lee de aquí.
-- =========================================================================
create or replace view public.opportunity_payment_summary
with (security_invoker = true)
as
select
  o.id as opportunity_id,
  coalesce(o.proposal_value, o.estimated_value, 0) as agreed_value,
  coalesce(sum(p.amount) filter (where p.status = 'confirmed'), 0) as total_paid,
  coalesce(o.proposal_value, o.estimated_value, 0) - coalesce(sum(p.amount) filter (where p.status = 'confirmed'), 0) as balance_due,
  case
    when coalesce(o.proposal_value, o.estimated_value, 0) > 0
      then round(coalesce(sum(p.amount) filter (where p.status = 'confirmed'), 0) / coalesce(o.proposal_value, o.estimated_value, 0) * 100, 1)
    else 0
  end as percent_paid
from public.opportunities o
left join public.payments p on p.opportunity_id = o.id
group by o.id, o.proposal_value, o.estimated_value;

grant select on public.opportunity_payment_summary to authenticated;
