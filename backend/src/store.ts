import { randomUUID } from 'node:crypto';
import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { supabase } from './supabase';

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.jsonl');

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LeadStatus = 'nuevo' | 'contactado' | 'en_progreso' | 'ganado' | 'perdido';

export interface LeadRecord {
  id: string;
  name: string;
  email: string;
  message: string;
  service: string | null;
  source: 'form' | 'chat' | 'schedule-link';
  status: LeadStatus;
  receivedAt: string;
}

/** Local fallback so a lead is never silently lost while Supabase isn't configured (or errors out). */
async function persistLeadLocal(record: LeadRecord): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(CONTACTS_FILE, JSON.stringify(record) + '\n', 'utf8');
}

/** Best-effort — posts the lead to the n8n workflow that emails sofimh1197@gmail.com. Never
 * throws into the caller: a slow/failing notification should never block saving the lead itself. */
async function notifyNewLead(lead: LeadRecord): Promise<void> {
  const webhookUrl = process.env.N8N_LEAD_NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) return;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: lead.name,
      email: lead.email,
      message: lead.message,
      service: lead.service,
      source: lead.source,
      receivedAt: lead.receivedAt,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`n8n respondió ${res.status}`);
  }
}

/** Persists a lead (contact form, chat capture_lead, or a booked call) to Supabase — falling back to
 * the local contacts.jsonl file if Supabase isn't configured or the insert fails — then fires off
 * (without waiting) the email notification to sofimh1197@gmail.com. */
export async function persistLead(record: Omit<LeadRecord, 'id' | 'receivedAt' | 'status'>): Promise<LeadRecord> {
  const full: LeadRecord = {
    id: randomUUID(),
    receivedAt: new Date().toISOString(),
    status: 'nuevo',
    ...record,
  };

  if (supabase) {
    const { error } = await supabase.from('leads').insert({
      id: full.id,
      name: full.name,
      email: full.email,
      message: full.message,
      service: full.service,
      source: full.source,
      status: full.status,
      received_at: full.receivedAt,
    });
    if (error) {
      console.error('[store] error guardando lead en Supabase, usando respaldo local:', error.message);
      await persistLeadLocal(full);
    }
  } else {
    await persistLeadLocal(full);
  }

  void notifyNewLead(full).catch((err) => {
    console.error('[store] error enviando aviso de nuevo contacto:', err instanceof Error ? err.message : err);
  });

  return full;
}

/** Best-effort upsert of a chat session's full transcript. `leadId` is only included in the
 * payload when non-null, so a later turn without a captured lead doesn't clobber one set earlier
 * in the same conversation. No-ops when Supabase isn't configured. */
export async function upsertConversation(input: {
  id: string;
  leadId: string | null;
  messages: unknown[];
  service?: string | null;
}): Promise<void> {
  if (!supabase) return;

  const payload: Record<string, unknown> = {
    id: input.id,
    messages: input.messages,
    updated_at: new Date().toISOString(),
  };
  if (input.leadId) payload.lead_id = input.leadId;
  if (input.service) payload.service = input.service;

  const { error } = await supabase.from('conversations').upsert(payload);
  if (error) {
    console.error('[store] error guardando conversación en Supabase:', error.message);
  }
}
