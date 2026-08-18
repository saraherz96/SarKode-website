-- SarKode CRM — 004_crm_backfill.sql
--
-- Trae al CRM los datos que ya existen en `leads` (formulario, chat, llamadas agendadas antes
-- de que existiera este módulo) sin borrar ni modificar la tabla `leads` original — solo lee de
-- ahí y crea/actualiza `contacts` + `opportunities` + `services` + una actividad inicial.
-- Idempotente: se puede correr varias veces, no duplica nada (usa `contacts.lead_id` /
-- `opportunities.lead_id` para saber qué ya se migró).
--
-- Corre esto después de 001-003. Recomendado correrlo también en producción — es lo que trae
-- los leads reales que ya llegaron por el sitio al CRM.

-- 1) Sembrar los 4 servicios reales (frontend/src/data/services.ts) si no existen todavía.
insert into public.services (slug, name)
values
  ('ai-agents', 'AI Agents'),
  ('automatizacion', 'Automatización'),
  ('productos', 'Productos'),
  ('ux-ui-design', 'UX/UI Design')
on conflict (slug) do nothing;

-- 2) Contactos: uno por lead que aún no tenga un contacto asociado, deduplicando por email o
--    teléfono contra contactos que ya existan (por si dos leads distintos son la misma persona).
do $$
declare
  v_lead record;
  v_contact_id uuid;
  v_service_id uuid;
  v_opportunity_status text;
  v_contact_source text;
begin
  for v_lead in select * from public.leads order by received_at asc loop
    -- ¿Ya se migró este lead?
    if exists (select 1 from public.contacts where lead_id = v_lead.id)
       or exists (select 1 from public.opportunities where lead_id = v_lead.id) then
      continue;
    end if;

    v_contact_source := case v_lead.source
      when 'form' then 'website_form'
      when 'chat' then 'website_chat'
      when 'schedule-link' then 'appointment'
      else 'manual'
    end;

    -- Buscar contacto existente por email o teléfono antes de crear uno nuevo.
    select id into v_contact_id
    from public.contacts
    where (email is not null and lower(trim(email)) = lower(trim(v_lead.email)))
       or (v_lead.phone is not null and phone is not null
           and regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(v_lead.phone, '[^0-9]', '', 'g'))
    limit 1;

    if v_contact_id is null then
      insert into public.contacts (full_name, email, phone, source, lead_id, created_at, updated_at)
      values (v_lead.name, v_lead.email, v_lead.phone, v_contact_source, v_lead.id, v_lead.received_at, v_lead.received_at)
      returning id into v_contact_id;
    else
      update public.contacts
      set lead_id = coalesce(lead_id, v_lead.id),
          phone = coalesce(phone, v_lead.phone)
      where id = v_contact_id;
    end if;

    -- Resolver el servicio (texto libre en leads.service) contra la tabla services por nombre.
    select id into v_service_id from public.services where lower(name) = lower(coalesce(v_lead.service, '')) limit 1;

    v_opportunity_status := case v_lead.status
      when 'nuevo' then 'new'
      when 'contactado' then 'contacted'
      when 'en_progreso' then 'in_progress'
      when 'ganado' then 'won'
      when 'perdido' then 'lost'
      else 'new'
    end;

    insert into public.opportunities (
      contact_id, service_id, title, description, client_needs, status, lead_id, created_at, updated_at,
      closed_at
    )
    values (
      v_contact_id,
      v_service_id,
      coalesce(v_lead.service, 'Consulta general') || ' — ' || v_lead.name,
      v_lead.message,
      v_lead.message,
      v_opportunity_status,
      v_lead.id,
      v_lead.received_at,
      v_lead.received_at,
      case when v_opportunity_status in ('won', 'lost') then v_lead.received_at else null end
    );

    insert into public.activities (contact_id, activity_type, title, description, created_at)
    values (v_contact_id, 'contact_created', 'Contacto migrado desde leads (' || v_lead.source || ')', v_lead.message, v_lead.received_at);
  end loop;
end;
$$;

-- 3) Enlazar conversaciones existentes (backend/src/store.ts las guarda con lead_id) a su
--    contacto/oportunidad recién creados, para que aparezcan en la ficha del contacto.
update public.conversations c
set contact_id = ct.id,
    opportunity_id = op.id
from public.contacts ct
left join public.opportunities op on op.contact_id = ct.id and op.lead_id = ct.lead_id
where c.lead_id = ct.lead_id
  and c.contact_id is null;
