-- SarKode CRM — 006_crm_list_views.sql
--
-- Vistas/función de solo-lectura para que el listado de Contactos y el Dashboard hagan UNA
-- consulta en vez de N+1 (una por contacto/tarjeta). Corre esto después de 001-003.

-- =========================================================================
-- contact_list_view — cada contacto + su último estado de oportunidad, próximo seguimiento,
-- última actividad y servicio más reciente, ya resueltos, para pintar la tabla de Contactos
-- directamente sin una consulta extra por renglón.
-- =========================================================================
create or replace view public.contact_list_view
with (security_invoker = true)
as
select
  c.*,
  latest_opp.status as latest_opportunity_status,
  latest_opp.service_name as latest_service_name,
  follow_up.next_follow_up_at,
  last_activity.last_activity_at
from public.contacts c
left join lateral (
  select o.status, s.name as service_name
  from public.opportunities o
  left join public.services s on s.id = o.service_id
  where o.contact_id = c.id
  order by o.created_at desc
  limit 1
) latest_opp on true
left join lateral (
  select min(o.next_follow_up_at) as next_follow_up_at
  from public.opportunities o
  where o.contact_id = c.id and o.next_follow_up_at is not null and o.status not in ('won', 'lost')
) follow_up on true
left join lateral (
  select max(a.created_at) as last_activity_at
  from public.activities a
  where a.contact_id = c.id
) last_activity on true;

grant select on public.contact_list_view to authenticated;

-- =========================================================================
-- crm_dashboard_stats — KPIs del Dashboard en una sola llamada, con los mismos filtros que
-- ofrece la pantalla (fecha, servicio, responsable, origen, estado). Devuelve un solo renglón
-- jsonb con todos los números para no tener que orquestar 8 consultas separadas del lado del
-- cliente. La lógica financiera (ingresos confirmados, saldo pendiente) vive aquí, no en el
-- frontend.
-- =========================================================================
create or replace function public.crm_dashboard_stats(
  p_since timestamptz default null,
  p_until timestamptz default null,
  p_service_id uuid default null,
  p_assigned_to uuid default null,
  p_source text default null,
  p_status text default null
)
returns jsonb
language plpgsql
security invoker
stable
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'new_opportunities', count(*) filter (where o.status = 'new'),
    'pending_contact', count(*) filter (where o.status = 'pending_contact'),
    'overdue_follow_ups', count(*) filter (
      where o.next_follow_up_at is not null and o.next_follow_up_at < now() and o.status not in ('won', 'lost')
    ),
    'proposals_sent', count(*) filter (where o.status in ('proposal_sent', 'negotiation')),
    'won', count(*) filter (where o.status = 'won'),
    'lost', count(*) filter (where o.status = 'lost'),
    'active_opportunities', count(*) filter (where o.status not in ('won', 'lost')),
    'total_opportunities', count(*),
    'conversion_rate', case when count(*) filter (where o.status in ('won', 'lost')) > 0
      then round(count(*) filter (where o.status = 'won')::numeric / count(*) filter (where o.status in ('won', 'lost')) * 100, 1)
      else 0
    end
  )
  into v_result
  from public.opportunities o
  join public.contacts c on c.id = o.contact_id
  where (p_since is null or o.created_at >= p_since)
    and (p_until is null or o.created_at <= p_until)
    and (p_service_id is null or o.service_id = p_service_id)
    and (p_assigned_to is null or o.assigned_to = p_assigned_to)
    and (p_source is null or c.source = p_source)
    and (p_status is null or o.status = p_status);

  select v_result || jsonb_build_object(
    'calls_today', (
      select count(*) from public.appointments a
      where a.starts_at >= date_trunc('day', now()) and a.starts_at < date_trunc('day', now()) + interval '1 day'
        and a.status in ('scheduled', 'confirmed')
    ),
    'no_shows', (
      select count(*) from public.appointments a where a.status = 'no_show'
        and (p_since is null or a.starts_at >= p_since) and (p_until is null or a.starts_at <= p_until)
    ),
    'confirmed_revenue', (
      select coalesce(sum(p.amount), 0) from public.payments p
      join public.opportunities o2 on o2.id = p.opportunity_id
      join public.contacts c2 on c2.id = o2.contact_id
      where p.status = 'confirmed'
        and (p_since is null or p.paid_at >= p_since)
        and (p_until is null or p.paid_at <= p_until)
        and (p_service_id is null or o2.service_id = p_service_id)
        and (p_assigned_to is null or o2.assigned_to = p_assigned_to)
        and (p_source is null or c2.source = p_source)
    ),
    'balance_due', (
      select coalesce(sum(s.balance_due), 0) from public.opportunity_payment_summary s
      join public.opportunities o3 on o3.id = s.opportunity_id
      join public.contacts c3 on c3.id = o3.contact_id
      where o3.status not in ('won', 'lost')
        and (p_service_id is null or o3.service_id = p_service_id)
        and (p_assigned_to is null or o3.assigned_to = p_assigned_to)
        and (p_source is null or c3.source = p_source)
    ),
    'proposals_expiring_soon', (
      select count(*) from public.proposals pr
      where pr.status = 'sent' and pr.expires_at is not null
        and pr.expires_at between now() and now() + interval '5 days'
    ),
    'deposits_pending', (
      select count(*) from public.opportunities o4 where o4.status = 'deposit_pending'
    )
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.crm_dashboard_stats(timestamptz, timestamptz, uuid, uuid, text, text) to authenticated;
