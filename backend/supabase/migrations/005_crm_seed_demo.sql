-- SarKode CRM — 005_crm_seed_demo.sql
--
-- ⚠️ SOLO PARA DESARROLLO/STAGING. NUNCA correr esto contra el proyecto de Supabase de
-- producción (el que usa backend/.env con los leads reales). Crea 8 contactos/oportunidades
-- ficticios (dominio de correo @demo.sarkode.dev, claramente identificables) que cubren cada
-- etapa del ciclo comercial, para poder probar y demostrar el CRM sin tocar datos reales.
--
-- Es seguro volver a correr: cada bloque hace `on conflict do nothing` / revisa por email antes
-- de insertar, así que no duplica los contactos demo si el archivo se ejecuta más de una vez.
--
-- Requiere haber corrido 001-004 antes (usa los 4 `services` sembrados en 004).

do $$
declare
  v_ai_agents_id uuid;
  v_automatizacion_id uuid;
  v_productos_id uuid;
  v_uxui_id uuid;
  v_contact_id uuid;
  v_opportunity_id uuid;
  v_proposal_id uuid;
begin
  select id into v_ai_agents_id from public.services where slug = 'ai-agents';
  select id into v_automatizacion_id from public.services where slug = 'automatizacion';
  select id into v_productos_id from public.services where slug = 'productos';
  select id into v_uxui_id from public.services where slug = 'ux-ui-design';

  -- 1) Dejó teléfono en la página, aún sin contactar.
  if not exists (select 1 from public.contacts where phone = '+52 55 1000 0001') then
    insert into public.contacts (full_name, phone, source)
    values ('Marisol Trejo', '+52 55 1000 0001', 'website_form')
    returning id into v_contact_id;

    insert into public.opportunities (contact_id, service_id, title, description, client_needs, status, next_action, next_follow_up_at)
    values (
      v_contact_id, v_ai_agents_id, 'AI Agents — Marisol Trejo',
      'Dejó su teléfono desde el formulario del sitio pidiendo que le llamen.',
      'Quiere un agente de WhatsApp para atender pedidos de su tienda.',
      'pending_contact', 'Llamar para agendar diagnóstico', now() + interval '1 day'
    ) returning id into v_opportunity_id;

    insert into public.tasks (contact_id, opportunity_id, title, status, priority, due_at)
    values (v_contact_id, v_opportunity_id, 'Primer contacto — Marisol Trejo', 'pending', 'high', now() + interval '1 day');

    insert into public.activities (contact_id, opportunity_id, activity_type, title)
    values (v_contact_id, v_opportunity_id, 'contact_created', 'Dejó teléfono en el formulario del sitio');
  end if;

  -- 2) Llamada agendada.
  if not exists (select 1 from public.contacts where email = 'diego.paredes@demo.sarkode.dev') then
    insert into public.contacts (full_name, email, company_name, source)
    values ('Diego Paredes', 'diego.paredes@demo.sarkode.dev', 'Paredes Logística', 'website_chat')
    returning id into v_contact_id;

    insert into public.opportunities (contact_id, service_id, title, description, client_needs, status, next_action, next_follow_up_at)
    values (
      v_contact_id, v_automatizacion_id, 'Automatización — Paredes Logística',
      'Agendó llamada desde el chat del sitio.',
      'Automatizar la conciliación de facturas entre su ERP y su banco.',
      'call_scheduled', 'Confirmar asistencia a la llamada', now() + interval '2 days'
    ) returning id into v_opportunity_id;

    insert into public.appointments (contact_id, opportunity_id, service_id, starts_at, ends_at, status, google_meet_url)
    values (
      v_contact_id, v_opportunity_id, v_automatizacion_id,
      now() + interval '2 days', now() + interval '2 days' + interval '30 minutes',
      'scheduled', 'https://meet.google.com/demo-diego-paredes'
    );

    insert into public.activities (contact_id, opportunity_id, activity_type, title)
    values (v_contact_id, v_opportunity_id, 'appointment_scheduled', 'Llamada agendada vía chat del sitio');
  end if;

  -- 3) Ya tuvo diagnóstico (llamada completada, con notas).
  if not exists (select 1 from public.contacts where email = 'valeria.nunez@demo.sarkode.dev') then
    insert into public.contacts (full_name, email, phone, company_name, source)
    values ('Valeria Núñez', 'valeria.nunez@demo.sarkode.dev', '+52 55 1000 0003', 'Núñez Consultores', 'appointment')
    returning id into v_contact_id;

    insert into public.opportunities (contact_id, service_id, title, description, client_needs, status, estimated_value, next_action, next_follow_up_at)
    values (
      v_contact_id, v_productos_id, 'Productos — Núñez Consultores',
      'Tuvo su llamada de diagnóstico.', 'Necesita un portal interno para dar seguimiento a sus consultorías.',
      'call_completed', 85000, 'Preparar propuesta', now() + interval '3 days'
    ) returning id into v_opportunity_id;

    insert into public.appointments (
      contact_id, opportunity_id, service_id, starts_at, ends_at, status, attended,
      client_problem, recommended_service_id, budget_mentioned, interest_level,
      decision_expected_at, next_step, next_contact_at, needs_proposal, call_notes
    ) values (
      v_contact_id, v_opportunity_id, v_productos_id,
      now() - interval '1 day', now() - interval '1 day' + interval '30 minutes',
      'completed', true,
      'Llevan el seguimiento de consultorías en hojas de cálculo dispersas.',
      v_productos_id, '$80,000 - $100,000 MXN', 'high',
      current_date + interval '10 days', 'Enviar propuesta con alcance y tiempos', now() + interval '3 days',
      true, 'Muy interesada, quiere arrancar el próximo mes.'
    );

    insert into public.activities (contact_id, opportunity_id, activity_type, title, description)
    values (v_contact_id, v_opportunity_id, 'appointment_completed', 'Llamada de diagnóstico realizada', 'Interés alto, pidió propuesta.');
  end if;

  -- 4) Propuesta enviada.
  if not exists (select 1 from public.contacts where email = 'rodrigo.aviles@demo.sarkode.dev') then
    insert into public.contacts (full_name, email, company_name, source)
    values ('Rodrigo Avilés', 'rodrigo.aviles@demo.sarkode.dev', 'Avilés & Asociados', 'referral')
    returning id into v_contact_id;

    insert into public.opportunities (contact_id, service_id, title, description, client_needs, status, estimated_value, proposal_value, next_action, next_follow_up_at)
    values (
      v_contact_id, v_uxui_id, 'UX/UI Design — Avilés & Asociados',
      'Rediseño de su plataforma de reservas.', 'Su app actual tiene una tasa de abandono muy alta en el checkout.',
      'proposal_sent', 60000, 58000, 'Dar seguimiento a la propuesta', now() + interval '4 days'
    ) returning id into v_opportunity_id;

    insert into public.proposals (opportunity_id, description, subtotal, tax, total, status, sent_at, expires_at)
    values (
      v_opportunity_id, 'Research + rediseño UI del flujo de reservas y checkout.',
      58000, 0, 58000, 'sent', now() - interval '2 days', now() + interval '12 days'
    ) returning id into v_proposal_id;

    insert into public.activities (contact_id, opportunity_id, activity_type, title)
    values (v_contact_id, v_opportunity_id, 'proposal_sent', 'Propuesta SK enviada por correo');
  end if;

  -- 5) Pagó 50% de anticipo.
  if not exists (select 1 from public.contacts where email = 'camila.rios@demo.sarkode.dev') then
    insert into public.contacts (full_name, email, company_name, source)
    values ('Camila Ríos', 'camila.rios@demo.sarkode.dev', 'Ríos Studio', 'website_form')
    returning id into v_contact_id;

    insert into public.opportunities (contact_id, service_id, title, description, client_needs, status, estimated_value, proposal_value, next_action, next_follow_up_at)
    values (
      v_contact_id, v_ai_agents_id, 'AI Agents — Ríos Studio',
      'Aceptó la propuesta y pagó anticipo.', 'Agente de atención a clientes para su tienda en línea.',
      'deposit_pending', 40000, 40000, 'Confirmar el anticipo y arrancar', now() + interval '2 days'
    ) returning id into v_opportunity_id;

    insert into public.proposals (opportunity_id, description, subtotal, tax, total, status, sent_at, accepted_at)
    values (v_opportunity_id, 'Agente de IA para atención al cliente vía WhatsApp.', 40000, 0, 40000, 'accepted', now() - interval '5 days', now() - interval '1 day')
    returning id into v_proposal_id;

    insert into public.payments (opportunity_id, proposal_id, payment_type, amount, payment_method, status, paid_at)
    values (v_opportunity_id, v_proposal_id, 'deposit', 20000, 'transferencia', 'confirmed', now() - interval '1 day');

    insert into public.activities (contact_id, opportunity_id, activity_type, title)
    values (v_contact_id, v_opportunity_id, 'payment_recorded', 'Anticipo del 50% confirmado');
  end if;

  -- 6) Proyecto en ejecución.
  if not exists (select 1 from public.contacts where email = 'hugo.beltran@demo.sarkode.dev') then
    insert into public.contacts (full_name, email, company_name, source)
    values ('Hugo Beltrán', 'hugo.beltran@demo.sarkode.dev', 'Beltrán Textiles', 'website_chat')
    returning id into v_contact_id;

    insert into public.opportunities (contact_id, service_id, title, description, client_needs, status, estimated_value, proposal_value, next_action, next_follow_up_at)
    values (
      v_contact_id, v_automatizacion_id, 'Automatización — Beltrán Textiles',
      'Proyecto en desarrollo.', 'Automatizar el control de inventario entre bodegas.',
      'in_progress', 70000, 70000, 'Entregar avance semanal', now() + interval '5 days'
    ) returning id into v_opportunity_id;

    insert into public.proposals (opportunity_id, description, subtotal, tax, total, status, sent_at, accepted_at)
    values (v_opportunity_id, 'Automatización de inventario multi-bodega con n8n.', 70000, 0, 70000, 'accepted', now() - interval '20 days', now() - interval '18 days')
    returning id into v_proposal_id;

    insert into public.payments (opportunity_id, proposal_id, payment_type, amount, payment_method, status, paid_at)
    values (v_opportunity_id, v_proposal_id, 'deposit', 35000, 'transferencia', 'confirmed', now() - interval '17 days');

    insert into public.activities (contact_id, opportunity_id, activity_type, title)
    values (v_contact_id, v_opportunity_id, 'note', 'Proyecto arrancó, primer sprint en curso.');
  end if;

  -- 7) Saldo pendiente.
  if not exists (select 1 from public.contacts where email = 'paola.serrano@demo.sarkode.dev') then
    insert into public.contacts (full_name, email, company_name, source)
    values ('Paola Serrano', 'paola.serrano@demo.sarkode.dev', 'Serrano Salud', 'event')
    returning id into v_contact_id;

    insert into public.opportunities (contact_id, service_id, title, description, client_needs, status, estimated_value, proposal_value, next_action, next_follow_up_at)
    values (
      v_contact_id, v_productos_id, 'Productos — Serrano Salud',
      'Proyecto entregado, falta liquidar.', 'Portal de citas para su clínica.',
      'final_payment_pending', 95000, 95000, 'Cobrar liquidación', now() + interval '3 days'
    ) returning id into v_opportunity_id;

    insert into public.proposals (opportunity_id, description, subtotal, tax, total, status, sent_at, accepted_at)
    values (v_opportunity_id, 'Portal de citas y expediente básico.', 95000, 0, 95000, 'accepted', now() - interval '40 days', now() - interval '38 days')
    returning id into v_proposal_id;

    insert into public.payments (opportunity_id, proposal_id, payment_type, amount, payment_method, status, paid_at)
    values
      (v_opportunity_id, v_proposal_id, 'deposit', 47500, 'transferencia', 'confirmed', now() - interval '37 days'),
      (v_opportunity_id, v_proposal_id, 'partial', 23750, 'transferencia', 'confirmed', now() - interval '10 days');

    insert into public.activities (contact_id, opportunity_id, activity_type, title)
    values (v_contact_id, v_opportunity_id, 'payment_recorded', 'Pago parcial recibido, queda saldo pendiente.');
  end if;

  -- 8) Oportunidad perdida.
  if not exists (select 1 from public.contacts where email = 'ivan.moreno@demo.sarkode.dev') then
    insert into public.contacts (full_name, email, company_name, source)
    values ('Iván Moreno', 'ivan.moreno@demo.sarkode.dev', 'Moreno Retail', 'website_form')
    returning id into v_contact_id;

    insert into public.opportunities (contact_id, service_id, title, description, client_needs, status, estimated_value, lost_reason, closed_at)
    values (
      v_contact_id, v_uxui_id, 'UX/UI Design — Moreno Retail',
      'Se fue con otro proveedor.', 'Rediseño de su catálogo en línea.',
      'lost', 30000, 'Eligió una agencia más económica.', now() - interval '5 days'
    ) returning id into v_opportunity_id;

    insert into public.pipeline_history (opportunity_id, previous_status, new_status, notes)
    values (v_opportunity_id, 'negotiation', 'lost', 'Eligió una agencia más económica.');

    insert into public.activities (contact_id, opportunity_id, activity_type, title, description)
    values (v_contact_id, v_opportunity_id, 'stage_changed', 'Oportunidad perdida', 'Eligió una agencia más económica.');
  end if;
end;
$$;
