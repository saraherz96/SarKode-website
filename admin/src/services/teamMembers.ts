import { supabase } from '../lib/supabase';
import { asError } from './errors';
import type { TeamMemberRef } from '../types/crm';

export async function listTeamMembers(): Promise<TeamMemberRef[]> {
  const { data, error } = await supabase.from('team_members').select('id, full_name').eq('is_active', true).order('full_name');
  if (error) throw asError(error, 'No se pudo cargar el equipo.');
  return (data as TeamMemberRef[]) || [];
}
