import { supabase } from '../lib/supabase';
import { asError } from './errors';
import type { Service } from '../types/crm';

export async function listServices(): Promise<Service[]> {
  const { data, error } = await supabase.from('services').select('*').eq('is_active', true).order('name');
  if (error) throw asError(error, 'No se pudieron cargar los servicios.');
  return (data as Service[]) || [];
}
