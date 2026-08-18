# Migraciones del CRM

Este proyecto no usa el CLI de Supabase (no hay `supabase/config.toml`) — igual que
`backend/supabase/schema.sql`, estos archivos se pegan a mano en el **SQL Editor** del
dashboard de Supabase (`https://supabase.com/dashboard/project/_/sql`), **en este orden**:

1. `001_crm_schema.sql` — tablas nuevas del CRM + columnas nuevas en `conversations`.
2. `002_crm_rls.sql` — Row Level Security (solo el equipo autenticado puede usar el CRM).
3. `003_crm_functions.sql` — funciones transaccionales (cambiar etapa, registrar resultado de
   llamada) y la vista de saldo por oportunidad.
4. `004_crm_backfill.sql` — trae los `leads` que ya existen al CRM (`contacts` + `opportunities`),
   sin tocar la tabla `leads`. **Recomendado correr también en producción.**
5. `005_crm_seed_demo.sql` — ⚠️ **solo en un proyecto de Supabase de desarrollo/staging**, nunca
   en el de producción. Crea 8 contactos ficticios (`@demo.sarkode.dev`) que cubren cada etapa
   del ciclo comercial, para poder probar y demostrar el CRM.
6. `006_crm_list_views.sql` — vista `contact_list_view` y función `crm_dashboard_stats(...)`,
   para que el listado de Contactos y el Dashboard hagan una sola consulta en vez de N+1.
7. `007_crm_appointment_reminders.sql` — columna `appointments.reminder_sent_at`, que usa el
   workflow de n8n `sarkode-appointment-reminder.workflow.json` para no mandar el mismo
   recordatorio de llamada dos veces. Necesaria si activas ese workflow (ver README de la raíz,
   "Habilitar el recordatorio de llamada").

Todo es idempotente: si algo falla a la mitad, puedes volver a correr el mismo archivo completo
sin duplicar datos.

## Dar de alta a alguien del equipo (acceso al CRM)

El CRM usa Supabase Auth (email + contraseña). No hay pantalla de "crear cuenta" — las cuentas
se dan de alta a mano, una sola vez por persona:

1. **Authentication → Users → Add user** en el dashboard de Supabase. Crea el usuario con su
   email de SarKode y una contraseña temporal (o activa "Send invite email" si tienes SMTP
   configurado en el proyecto).
2. Copia el **User UID** que Supabase generó.
3. En el **SQL Editor**, corre:
   ```sql
   insert into public.team_members (id, full_name, email, role)
   values ('EL-UUID-DEL-PASO-2', 'Nombre Apellido', 'persona@sarkode.com', 'sales');
   -- role: 'admin' | 'sales' | 'ops'
   ```
   Sin este renglón en `team_members`, la persona puede iniciar sesión pero no verá ningún dato
   (`is_team_member()` en `002_crm_rls.sql` bloquea todo por RLS hasta que exista el renglón).
4. Pídele que entre en `admin/` con ese email y contraseña, y que la cambie desde
   Supabase Auth si usaste una temporal.
