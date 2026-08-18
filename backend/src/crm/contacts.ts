import { supabase } from '../supabase';
import type { CrmContact, ContactSource } from './types';

/** Same normalization as the `contacts_phone_unique_idx` partial index in
 * 001_crm_schema.sql — strip everything but digits before comparing. */
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/** Finds a contact by email or (normalized) phone, updates it with any new info, or creates
 * one if none matches — this is the single place that keeps a person from being duplicated in
 * `contacts` no matter how many times they reach out (form, chat, phone, scheduled call). */
export async function findOrCreateContact(input: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  source: ContactSource;
  leadId?: string | null;
}): Promise<CrmContact | null> {
  if (!supabase) return null;

  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;
  if (!email && !phone) return null;

  let existing: CrmContact | null = null;

  if (email) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();
    if (error) console.error('[crm] error buscando contacto por email:', error.message);
    else if (data) existing = data as CrmContact;
  }

  if (!existing && phone) {
    const normalized = normalizePhone(phone);
    // No hay operador "normalizar y comparar" en PostgREST, así que se compara sobre el
    // conjunto completo — el volumen de contactos de un sitio como este lo hace viable.
    const { data, error } = await supabase.from('contacts').select('id, full_name, email, phone').not('phone', 'is', null);
    if (error) {
      console.error('[crm] error buscando contacto por teléfono:', error.message);
    } else {
      existing = ((data as CrmContact[]) || []).find((c) => c.phone && normalizePhone(c.phone) === normalized) || null;
    }
  }

  if (existing) {
    const patch: Record<string, unknown> = { lead_id: input.leadId ?? undefined };
    if (!existing.email && email) patch.email = email;
    if (!existing.phone && phone) patch.phone = phone;
    if (input.companyName) patch.company_name = input.companyName;
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('contacts').update(patch).eq('id', existing.id);
      if (error) console.error('[crm] error actualizando contacto existente:', error.message);
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      full_name: input.fullName,
      email,
      phone,
      company_name: input.companyName || null,
      source: input.source,
      lead_id: input.leadId || null,
    })
    .select('id, full_name, email, phone')
    .single();

  if (error) {
    // Carrera con otra solicitud concurrente que ya insertó el mismo email/teléfono —
    // los índices únicos de 001_crm_schema.sql lo rechazan; se reintenta la búsqueda una vez.
    if (error.code === '23505') {
      console.warn('[crm] contacto duplicado detectado por índice único, reintentando búsqueda');
      return findOrCreateContact(input);
    }
    console.error('[crm] error creando contacto:', error.message);
    return null;
  }

  return data as CrmContact;
}
