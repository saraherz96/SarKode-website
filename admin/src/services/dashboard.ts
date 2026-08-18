import { supabase } from '../lib/supabase';
import { asError } from './errors';

export interface DashboardStats {
  new_opportunities: number;
  pending_contact: number;
  overdue_follow_ups: number;
  proposals_sent: number;
  won: number;
  lost: number;
  active_opportunities: number;
  total_opportunities: number;
  conversion_rate: number;
  calls_today: number;
  no_shows: number;
  confirmed_revenue: number;
  balance_due: number;
  proposals_expiring_soon: number;
  deposits_pending: number;
}

export interface DashboardFilters {
  since?: string | null;
  until?: string | null;
  serviceId?: string | null;
  assignedTo?: string | null;
  source?: string | null;
  status?: string | null;
}

/** Una sola llamada a la función `crm_dashboard_stats` (006_crm_list_views.sql) — todo el
 * cálculo (incluido el financiero) vive en la base de datos, no en el frontend. */
export async function getDashboardStats(filters: DashboardFilters = {}): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('crm_dashboard_stats', {
    p_since: filters.since || null,
    p_until: filters.until || null,
    p_service_id: filters.serviceId || null,
    p_assigned_to: filters.assignedTo || null,
    p_source: filters.source || null,
    p_status: filters.status || null,
  });
  if (error) throw asError(error, 'No se pudieron cargar las métricas.');
  return data as DashboardStats;
}
