import { supabase } from '../lib/supabase';
import { asError } from './errors';
import type { CrmTask, TaskStatus } from '../types/crm';

const SELECT_WITH_JOINS = '*, contact:contacts(id, full_name), opportunity:opportunities(id, title)';

export async function listTasks(filter: {
  status?: TaskStatus[];
  assignedTo?: string;
  contactId?: string;
  opportunityId?: string;
} = {}): Promise<CrmTask[]> {
  let query = supabase.from('tasks').select(SELECT_WITH_JOINS);
  if (filter.status && filter.status.length > 0) query = query.in('status', filter.status);
  if (filter.assignedTo) query = query.eq('assigned_to', filter.assignedTo);
  if (filter.contactId) query = query.eq('contact_id', filter.contactId);
  if (filter.opportunityId) query = query.eq('opportunity_id', filter.opportunityId);

  const { data, error } = await query.order('due_at', { ascending: true, nullsFirst: false });
  if (error) throw asError(error, 'No se pudieron cargar las tareas.');
  return (data as unknown as CrmTask[]) || [];
}

export async function createTask(input: {
  contactId?: string | null;
  opportunityId?: string | null;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('tasks').insert({
    contact_id: input.contactId || null,
    opportunity_id: input.opportunityId || null,
    title: input.title,
    description: input.description || null,
    due_at: input.dueAt || null,
    priority: input.priority || 'medium',
    assigned_to: input.assignedTo || null,
  });
  if (error) throw asError(error, 'No se pudo crear la tarea.');
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  const { error } = await supabase.from('tasks').update(patch).eq('id', id);
  if (error) throw asError(error, 'No se pudo actualizar la tarea.');
}
