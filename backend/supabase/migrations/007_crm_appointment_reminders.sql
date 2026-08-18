-- SarKode CRM — 007_crm_appointment_reminders.sql
--
-- Agrega el tracking para el recordatorio de llamada (2 horas antes, a sofimh1197@gmail.com y al
-- cliente) que manda el workflow de n8n `sarkode-appointment-reminder.workflow.json`. Corre esto
-- después de 001-006. Idempotente — seguro volver a correrlo.

-- `reminder_sent_at` marca si ya se mandó el recordatorio de esta cita, para que el workflow
-- (que se ejecuta cada pocos minutos) nunca mande el mismo recordatorio dos veces.
alter table public.appointments add column if not exists reminder_sent_at timestamptz;

-- El workflow busca, en cada corrida, las citas con reminder_sent_at nulo cuyo starts_at cae
-- dentro de la ventana de ~2 horas antes — este índice parcial hace esa búsqueda barata sin
-- tener que escanear citas ya recordadas o completadas/canceladas.
create index if not exists appointments_reminder_pending_idx
  on public.appointments (starts_at)
  where reminder_sent_at is null and status in ('scheduled', 'confirmed');
