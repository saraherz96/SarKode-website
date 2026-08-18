export interface SlotOption {
  start: string;
  end: string;
  humanLabel: string;
}

export interface ScheduleCallResult {
  success: boolean;
  start: string;
  end: string;
  /** Google Meet link for the booked call, when the n8n workflow returns one. */
  meetLink: string | null;
  /** Google Calendar event ID for the booked call, when the n8n workflow returns one (see
   * backend/n8n/sarkode-schedule-call.workflow.json — "Responder confirmación" node). Used to
   * store the appointment in the CRM (backend/src/crm/appointments.ts). */
  eventId: string | null;
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

/** Step 2: book the slot the person chose from the list returned by requestAvailability.
 * `message` is what the person says they need/want to build, and `service` is the SarKode
 * service it maps to (if known) — both are forwarded to n8n so they end up in the calendar
 * event's description, and are returned here so the caller can include them (plus the Meet
 * link n8n sends back) in the lead notification email. */
export async function confirmSlot(
  name: string,
  email: string,
  start: string,
  end: string,
  message: string,
  service: string | null,
): Promise<ScheduleCallResult> {
  const data = await callWebhook({ name, email, start, end, message, service });
  if (data.success !== true) {
    throw new Error('n8n no confirmó la reserva.');
  }
  const meetLink = typeof data.meetLink === 'string' && data.meetLink.trim() ? data.meetLink.trim() : null;
  const eventId = typeof data.eventId === 'string' && data.eventId.trim() ? data.eventId.trim() : null;
  return { success: true, start, end, meetLink, eventId };
}
