import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    '[admin] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copia admin/.env.example a admin/.env y complétalo.',
  );
}

/** Cliente único de Supabase para toda la app admin. Usa la key `anon` (pública) — nunca la
 * `service_role` (esa vive solo en backend/.env). RLS (backend/supabase/migrations/002_crm_rls.sql)
 * es lo único que autoriza el acceso real: sin una sesión de alguien en `team_members`, esta key
 * no puede leer ni escribir nada del CRM. */
export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: { persistSession: true, autoRefreshToken: true },
});
