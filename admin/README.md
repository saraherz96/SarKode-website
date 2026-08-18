# SarKode CRM (admin/)

App interna del equipo de SarKode para administrar todo el ciclo comercial: prospectos que
dejaron su correo/teléfono en el sitio, llamadas agendadas, seguimiento, propuestas y pagos. Ver
la documentación completa en el [README de la raíz](../README.md#crm-interno-admin) y en
[`backend/supabase/migrations/README.md`](../backend/supabase/migrations/README.md).

- **Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4, React Router, Supabase Auth + JS
  client (key `anon`, protegido por RLS — nunca la `service_role`).
- **No tiene backend propio**: habla directo con Supabase (RLS decide qué puede ver/editar cada
  quien) para lecturas/escrituras normales, y usa funciones SQL (`crm_change_opportunity_status`,
  `crm_complete_appointment`, `crm_dashboard_stats`) para las operaciones que tocan varias tablas
  o cálculos financieros — ver `backend/supabase/migrations/003_crm_functions.sql`.

## Correr en desarrollo

```bash
cp .env.example .env   # y completa VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev             # http://localhost:5174 (o el puerto libre que asigne Vite)
```

Necesitas una cuenta dada de alta en `team_members` para poder ver datos — ver "Dar de alta a
alguien del equipo" en `backend/supabase/migrations/README.md`. Sin eso, el login funciona pero
la app muestra "Tu cuenta no tiene acceso al CRM".

## Build / deploy

```bash
npm run build   # genera admin/dist (estático)
```

`admin/dist` se despliega igual que `frontend/dist` — cualquier CDN/Cloudflare Pages, siempre
que `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` estén configuradas en el entorno de build.
`admin/wrangler.jsonc` está listo para un proyecto de Cloudflare Pages **separado** del sitio
público (por ejemplo `admin.sarkode.com` o `crm.sarkode.com`), para no mezclar el bundle interno
con el sitio de marketing.
