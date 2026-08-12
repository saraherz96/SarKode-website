export interface SlotOption {
  start: string;
  end: string;
  humanLabel: string;
}

export interface ScheduleCallResult {
  success: boolean;
  start: string;
  end: string;
}

/** Posts to the n8n workflow. Presence of `start`/`end` in the body tells the workflow whether
 * to list availability (omitted) or book that specific slot (provided). */
async function callWebhook(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const webhookUrl = process.env.N8N_SCHEDULE_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('N8N_SCHEDULE_WEBHOOK_URL no está configurado.');
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await res.json().catch(() => null)) as (Record<string, unknown> & { error?: string; message?: string }) | null;
  if (!res.ok || !data || data.success === false) {
    const reason = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(String(reason));
  }
  return data;
}

/** Step 1: fetch the list of open 30-min slots — no booking happens here, no name/email needed yet. */
export async function requestAvailability(): Promise<SlotOption[]> {
  const data = await callWebhook({});
  if (!Array.isArray(data.slots)) {
    throw new Error('n8n no devolvió horarios disponibles.');
  }
  return data.slots as SlotOption[];
}

/** Step 2: book the slot the person chose from the list returned by requestAvailability. */
export async function confirmSlot(name: string, email: string, start: string, end: string): Promise<ScheduleCallResult> {
  const data = await callWebhook({ name, email, start, end });
  if (data.success !== true) {
    throw new Error('n8n no confirmó la reserva.');
  }
  return { success: true, start, end };
}
