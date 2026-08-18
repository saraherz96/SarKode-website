import { supabase } from '../supabase';

/** Resuelve el nombre de servicio que ya usan el formulario y el agente de chat (ver
 * frontend/src/data/services.ts y agent.ts CAPTURE_LEAD_TOOL: "AI Agents", "Automatización",
 * "Productos", "UX/UI Design", o "No especificado"/vacío) contra la tabla `services` sembrada
 * por backend/supabase/migrations/004_crm_backfill.sql. No inventa servicios nuevos — si no
 * encuentra coincidencia, la oportunidad simplemente queda sin `service_id`. */
export async function resolveServiceId(serviceName: string | null | undefined): Promise<string | null> {
  if (!supabase || !serviceName || !serviceName.trim() || serviceName.trim().toLowerCase() === 'no especificado') {
    return null;
  }

  const { data, error } = await supabase
    .from('services')
    .select('id')
    .ilike('name', serviceName.trim())
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[crm] error resolviendo servicio:', error.message);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}
