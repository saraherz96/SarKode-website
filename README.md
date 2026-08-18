# SarKode — React + TypeScript + Node

Landing page de SarKode, migrada del prototipo estático original
(`Index.html` + `support.js`, un runtime de plantillas propietario) a un
stack estándar:

- **frontend/** — React 19 + TypeScript, servido con Vite. Estilos inline
  (fieles al original) + una hoja de estilos global para hovers, keyframes
  y responsive.
- **backend/** — Node + Express + TypeScript. Expone `POST /api/contact`
  (formulario clásico) y `POST /api/chat` (agente de IA conversacional,
  ver abajo). Ambos guardan cada contacto capturado en **Supabase**
  (tablas `leads` y `conversations` — ver "Habilitar Supabase" abajo), con
  `backend/data/contacts.jsonl` como respaldo local mientras eso no esté
  configurado.

Los archivos originales (`Index.html`, `support.js`, `assets/`, `uploads/`)
se mantienen en la raíz sin modificar, como referencia.

## Requisitos

- Node.js 20+ y npm

## Cómo correrlo en desarrollo

### Opción 1 — un solo comando (recomendado)

Es un monorepo con npm workspaces: `frontend` y `backend` siguen siendo
proyectos independientes, pero la raíz tiene scripts que orquestan ambos.

```bash
npm install    # instala frontend + backend
npm run dev    # levanta backend (:4000) y frontend (:5173) juntos
```

### Opción 2 — cada proyecto por separado

Abre dos terminales:

```bash
# Terminal 1 — backend (http://localhost:4000)
cd backend
npm install
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

El frontend lee la URL del backend de `frontend/.env` (`VITE_API_URL`,
por defecto `http://localhost:4000`). Copia `.env.example` a `.env` en
ambas carpetas si no existen.

### Habilitar el agente de IA del chat de contacto

El modal de contacto es un chat conversacional (no un formulario estático):
un agente construido con la API de OpenAI (Chat Completions + function
calling, modelo `gpt-4o-mini` por defecto) conversa con la persona
visitante, entiende qué necesita, y cuando ya tiene su nombre + email + un
resumen del proyecto, llama a una función (`capture_lead`) que guarda el
contacto en el backend.

Para que funcione necesitas una API key de OpenAI:

1. Consigue una en <https://platform.openai.com/api-keys>.
2. En `backend/.env`, agrega:
   ```
   OPENAI_API_KEY=sk-...
   ```
3. (Opcional) si quieres usar otro modelo distinto a `gpt-4o-mini`, agrega
   también `OPENAI_MODEL=gpt-4o` (o el que tengas disponible).
4. Reinicia el backend (`npm run dev`).

Sin la key configurada, `/api/chat` responde `503` con un mensaje claro
en vez de fallar en silencio — el resto del sitio (incluido el envío por
`/api/contact`, si lo sigues usando en algún lado) funciona igual.

### Habilitar "agendar llamada" (n8n + Google Calendar)

Hay dos formas de agendar, ambas contra el mismo workflow de **n8n**:

- **El enlace "Agenda una llamada de 30 min →"** (columna izquierda del
  modal de contacto) — deja elegir primero el **día**, luego la **hora**
  dentro de ese día, y al final pide nombre + email antes de confirmar.
  Dos llamadas al backend: `POST /api/schedule-call/availability` (lista
  horarios agrupables por día, no agenda nada) y
  `POST /api/schedule-call/confirm` (agenda el horario elegido con esos
  datos). No pasa por el agente de IA — es determinístico.
- **Dentro del chat** — si la persona le pide al agente agendar una
  llamada, la IA junta nombre + email y agenda automáticamente el
  **primer horario disponible** (usa las mismas dos funciones internamente,
  pero sin pedirle a la persona que elija — para eso está el enlace).

El workflow de n8n usa el mismo webhook para ambos pasos, distinguiendo
por si el body trae un horario elegido o no:

1. **Sin horario elegido** (body vacío) → consulta la disponibilidad real
   del calendario de **sofimh1197@gmail.com** (días hábiles, próximos 10
   días) y devuelve hasta 8 horarios libres de 30 min, sin agendar nada ni
   pedir datos personales todavía.
2. **Con horario elegido** (`{name, email, start, end}`) → crea el evento
   en Google Calendar directo en ese horario, con asunto
   **"–Follow up – SarKode"**, un enlace de **Google Meet** generado
   automáticamente, agrega al cliente como invitado (Google le manda la
   invitación por email automáticamente) y queda en el calendario de
   sofimh1197@gmail.com.

**Setup (una sola vez), en tu instancia de n8n:**

1. Importa `backend/n8n/sarkode-schedule-call.workflow.json` en n8n
   (menú **⋯ → Import from File**, o pega el JSON con **Import from URL/Clipboard**).
2. Abre los dos nodos **Google Calendar** (`Disponibilidad` y `Crear evento`)
   y en *Credential* crea/selecciona `Google Calendar OAuth2`, autorizando
   con **sofimh1197@gmail.com**. (Esto abre un login de Google — solo la
   dueña de esa cuenta puede hacerlo.)
3. Abre el nodo de código **Listar horarios disponibles** y ajusta si hace
   falta `TIMEZONE`, `WORK_START_HOUR` / `WORK_END_HOUR` a la disponibilidad
   real (por defecto: `America/Mexico_City`, 9am–6pm, lunes a viernes).
4. El nodo **Crear evento** ya trae *Conference Data* configurado para
   generar el Google Meet automáticamente — no requiere ajustes.
5. Activa el workflow (toggle arriba a la derecha del editor).
6. Copia la **Production URL** del nodo *Webhook* (algo como
   `https://tu-instancia.app.n8n.cloud/webhook/schedule-call`) y pégala en
   `backend/.env`:
   ```
   N8N_SCHEDULE_WEBHOOK_URL=https://tu-instancia.app.n8n.cloud/webhook/schedule-call
   ```
7. Reinicia el backend.

Mientras `N8N_SCHEDULE_WEBHOOK_URL` no esté configurada, ni el enlace ni el
chat pueden agendar — `/api/schedule-call` responde `503` con un mensaje
claro, y el chat simplemente no ofrece la opción (sigue funcionando normal
para dejar el contacto); no hay que hacer nada especial para desactivarlo.
Nota: el nodo de código es
JavaScript puro, así que no depende de la versión de n8n — si al importar
alguno de los nodos de Google Calendar muestra un aviso, ábrelo y vuelve a
seleccionar el calendario/credencial en el desplegable, es un ajuste de
segundos.

### Habilitar Supabase (leads, conversaciones y seguimiento)

Todo contacto que se guarda —formulario, chat, o llamada agendada— se
inserta en dos tablas de Supabase:

- **`leads`** — un renglón por contacto: nombre, email, mensaje/resumen,
  servicio, de dónde vino (`source`), y un campo **`status`** para dar
  seguimiento (`nuevo` → `contactado` → `en_progreso` → `ganado`/`perdido`)
  que se actualiza a mano desde el **Table Editor** de Supabase — no hay
  una pantalla de CRM en el sitio, es directo en la tabla.
- **`conversations`** — el historial completo de cada sesión de chat con
  el agente (todos los turnos, en `messages` como JSON), enlazado al
  `lead_id` correspondiente en cuanto esa conversación capture un contacto
  o agende una llamada.

**Setup (una sola vez):**

1. Crea un proyecto gratis en <https://supabase.com> (**New Project**).
2. Ve a **SQL Editor**, pega el contenido de `backend/supabase/schema.sql`
   y dale **Run** — crea las dos tablas.
3. En **Settings → API**, copia el **Project URL** y la key **`service_role`**
   (no la `anon`/pública — el backend necesita poder escribir sin RLS).
4. En `backend/.env`:
   ```
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
5. Reinicia el backend.

Sin estas variables, los leads se siguen guardando (en
`backend/data/contacts.jsonl`) pero no hay tabla en Supabase ni se guardan
conversaciones — no hay que hacer nada especial para desactivarlo, es el
mismo patrón de "feature opcional" que el resto del backend.

### Habilitar el aviso por correo de nuevo contacto (n8n + Gmail)

Cada vez que se guarda un lead nuevo (por cualquiera de las 3 vías), el
backend le avisa —sin bloquear la respuesta al usuario— a un workflow de
n8n que le manda un correo a **sofimh1197@gmail.com** con los datos del
contacto y lo que está solicitando, para poder darle seguimiento.

**Setup (una sola vez), en tu instancia de n8n:**

1. Importa `backend/n8n/sarkode-new-lead-notification.workflow.json` en n8n.
2. Abre el nodo **Gmail** y en *Credential* crea `Gmail OAuth2`, autorizando
   con **sofimh1197@gmail.com**. (Es una credencial distinta a la de Google
   Calendar del otro workflow, aunque sea la misma cuenta — Gmail y
   Calendar son APIs/scopes separados en n8n.)
3. Activa el workflow.
4. Copia la **Production URL** del nodo *Webhook* y pégala en `backend/.env`:
   ```
   N8N_LEAD_NOTIFICATION_WEBHOOK_URL=https://tu-instancia.app.n8n.cloud/webhook/new-lead-notification
   ```
5. Reinicia el backend.

Sin esta variable, los leads se guardan igual — simplemente no llega el
correo de aviso.

### Habilitar el recordatorio de llamada, 2 horas antes (n8n + Gmail)

Un workflow de n8n aparte, sin conexión con el backend (corre solo, con un
Schedule Trigger cada 10 minutos — no necesita ninguna variable en
`backend/.env`), revisa las citas agendadas (`appointments` en Supabase) y,
2 horas antes de cada una, manda dos correos: uno a
**sofimh1197@gmail.com** con los datos del cliente y la llamada, y un
recordatorio amistoso al **cliente** con el horario y el link de Google
Meet.

**Setup (una sola vez), en tu instancia de n8n:**

1. Corre `backend/supabase/migrations/007_crm_appointment_reminders.sql` en
   el SQL Editor de Supabase (agrega la columna que evita mandar el mismo
   recordatorio dos veces).
2. Importa `backend/n8n/sarkode-appointment-reminder.workflow.json` en n8n.
3. Abre los nodos **Buscar citas por recordar** y **Marcar recordatorio
   enviado** (HTTP Request) y en cada uno reemplaza
   `REPLACE_WITH_YOUR_SUPABASE_PROJECT_REF` en la URL y
   `REPLACE_WITH_YOUR_SUPABASE_SERVICE_ROLE_KEY` en los headers `apikey` y
   `Authorization`, con los mismos valores de `SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY` de `backend/.env`.
4. Abre los nodos **Recordatorio interno a SarKode** y **Recordatorio al
   cliente** (Gmail) y en *Credential* selecciona la misma `Gmail OAuth2`
   que ya usas en `sarkode-new-lead-notification` — no hace falta crear una
   nueva.
5. Activa el workflow.

Solo aplica a citas agendadas **después** de que actives esto — no manda
recordatorios retroactivos de citas ya agendadas antes.

## CRM interno (admin/)

Además del sitio público, el repo incluye una app interna (`admin/`, ver su propio
[README](admin/README.md)) para que el equipo de SarKode administre todo el ciclo comercial de
cada persona que dejó su correo/teléfono o agendó una llamada: contacto, oportunidad por
servicio, pipeline (Kanban), citas con el resultado de la llamada, tareas de seguimiento,
propuestas y pagos (anticipo/parcial/liquidación) con saldo calculado automáticamente.

- **Solo para el equipo**: login con Supabase Auth (email + contraseña); Row Level Security
  (`backend/supabase/migrations/002_crm_rls.sql`) garantiza que un visitante del sitio público
  nunca pueda leer contactos, conversaciones, propuestas ni pagos — ni con la key `anon`.
- **Reutiliza lo que ya existía**: no se tocó `leads` ni `conversations`; el CRM agrega
  `contacts`, `opportunities`, `appointments`, `activities`, `tasks`, `proposals`, `payments`,
  `pipeline_history`, `services`, `messages` y `team_members` encima, y trae los leads que ya
  habían llegado (`004_crm_backfill.sql`).
- **Setup**: corre las migraciones en orden (ver
  [`backend/supabase/migrations/README.md`](backend/supabase/migrations/README.md)), da de alta
  a cada persona del equipo en `team_members`, configura `admin/.env` (`VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY` — nunca la `service_role`) y corre `npm run dev -w admin`.
- El backend (`backend/src/crm/`) alimenta el CRM automáticamente desde los 3 flujos públicos ya
  existentes — formulario, chat, y agendar llamada — deduplicando contactos por email/teléfono,
  sin cambiar el comportamiento que ya tenían esos endpoints.

## Pruebas

```bash
npm run test          # desde la raíz — corre backend/src/__tests__ (vitest)
```

Cubre: deduplicación de contactos, creación de oportunidades desde el formulario y desde
agendar llamada, guardado de mensajes individuales, cambio de etapa vía la función transaccional,
validación de las rutas públicas, manejo de errores de n8n/Calendar, y una prueba estática que
falla si alguna tabla del CRM se queda sin Row Level Security. Las pruebas nunca tocan Supabase,
n8n ni OpenAI reales (ver `backend/src/__tests__/setup.ts` y `fakeSupabase.ts`). Lo único que no
se puede probar sin una instancia real de Postgres es RLS "en caliente" (queda cubierto solo
estáticamente) — ver la nota en `backend/src/__tests__/migrations.rls.test.ts`.

## Build de producción

```bash
cd backend && npm run build && npm start     # sirve la API en :4000
cd frontend && npm run build                  # genera frontend/dist (estático, sitio público)
cd admin && npm run build                     # genera admin/dist (estático, CRM interno)
```

`frontend/dist` y `admin/dist` son sitios estáticos independientes: cada uno puede desplegarse en
cualquier CDN (Cloudflare Pages, Vercel, Netlify, S3, etc.) — `frontend` con `VITE_API_URL`
apuntando al backend desplegado, `admin` con `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Se
recomienda desplegarlos en dominios/subdominios distintos (p.ej. `sarkode.com` y
`admin.sarkode.com`) para no mezclar el sitio público con la herramienta interna.

## Estructura

```
frontend/
  src/
    components/   Navbar, Hero, Services, ServicesModal, Trabajamos,
                   CtaFinal, Footer, ContactModal, ServiceIcon
    data/          contenido de los 4 servicios + texto del heading
    App.tsx         estado global (scroll, modales) y efectos (parallax
                    del video, reveal del heading, lock de scroll, Esc)
  public/assets/    logo, logo-frase, video de fondo

backend/
  src/
    agent.ts              system prompt + tools (capture_lead, schedule_call) + cliente OpenAI
    scheduling.ts           llama al webhook de n8n para agendar la llamada
    supabase.ts              cliente de Supabase (null si no está configurado)
    store.ts                persistencia de leads/conversaciones/mensajes (Supabase, con
                             respaldo en contacts.jsonl) + aviso por correo al guardar un lead
    crm/                    capa de servicios del CRM — contacts.ts, opportunities.ts,
                             appointments.ts, activities.ts, tasks.ts, services.ts (deduplica
                             contactos y alimenta el CRM desde los 3 flujos públicos)
    routes/contact.ts     POST /api/contact (formulario clásico)
    routes/chat.ts         POST /api/chat (agente conversacional)
    routes/schedule-call.ts POST /api/schedule-call (agendar directo, sin IA)
    index.ts                servidor Express (cors, json, /health) — exporta `app` para pruebas
    __tests__/               pruebas (vitest) — ver "Pruebas" arriba
  supabase/
    schema.sql               tablas `leads` y `conversations` — pegar en el SQL Editor de Supabase
    migrations/               módulo de CRM (contacts, opportunities, appointments, etc.) — ver
                               backend/supabase/migrations/README.md
  n8n/
    sarkode-schedule-call.workflow.json          workflow importable: disponibilidad → crear evento
                                                  (responde meetLink + eventId)
    sarkode-new-lead-notification.workflow.json  workflow importable: aviso por Gmail al guardar un lead
    sarkode-appointment-reminder.workflow.json   workflow importable: recordatorio 2h antes de cada
                                                  llamada, por Gmail, a sofimh1197@gmail.com y al cliente

admin/
  src/
    lib/                    cliente de Supabase (key anon) + AuthProvider/useAuth
    services/                capa de repositorios — un archivo por entidad del CRM, toda la
                              lectura/escritura a Supabase pasa por aquí (nada de queries sueltas
                              en los componentes)
    types/crm.ts              tipos TypeScript del esquema del CRM
    components/               Layout, ProtectedRoute, badges de estado, pestañas del detalle
                              de contacto (Oportunidades, Citas, Conversaciones, Tareas, etc.)
    pages/                    Dashboard, Pipeline (Kanban), Contactos, Citas, Conversaciones,
                              Tareas, Propuestas, Pagos, Automatizaciones
```

## Notas de la migración

- El modal de "Contáctanos" es ahora un **chat con un agente de IA**
  (`POST /api/chat`, API de OpenAI + function calling) en vez del
  formulario estático original — ver "Habilitar el agente de IA" arriba.
  El endpoint clásico `POST /api/contact` se mantiene por si se necesita
  un formulario simple en otro lugar.
- El chat también puede **agendar la llamada de 30 min directamente**,
  vía un workflow de n8n que consulta disponibilidad real en Google
  Calendar y crea el evento — ver "Habilitar 'agendar llamada'" arriba.
- Los leads y las conversaciones del agente se guardan en **Supabase**, con
  un campo de estado para dar seguimiento, y cada lead nuevo dispara un
  aviso por correo a sofimh1197@gmail.com vía n8n — ver "Habilitar
  Supabase" y "Habilitar el aviso por correo" arriba.
- Las 4 tarjetas de servicios en la sección "Qué hacemos" ahora abren el
  modal de servicios al hacer click (en el original los handlers existían
  en la lógica pero no estaban conectados a ningún elemento).
- Se agregó el **CRM interno** (`admin/`, ver arriba) — sin quitar ni renombrar nada de lo que ya
  funcionaba. El único cambio operativo en algo ya desplegado es el nodo **"Responder
  confirmación"** del workflow `sarkode-schedule-call` de n8n, que ahora también devuelve
  `eventId` (antes solo `meetLink`) para poder guardar la cita en el CRM — si ya tenías ese
  workflow importado en tu instancia de n8n, vuelve a importar
  `backend/n8n/sarkode-schedule-call.workflow.json` (o pega manualmente el nuevo
  `responseBody` en ese nodo) para que el `eventId` empiece a llegar.
- Todo el resto de la interacción (navbar que se compacta al hacer scroll,
  parallax del video del hero, animación de aparición palabra por palabra
  del heading, flip-cards con hover, cierre de modales con Esc, bloqueo de
  scroll con modal abierto) se portó 1:1 a hooks de React.
