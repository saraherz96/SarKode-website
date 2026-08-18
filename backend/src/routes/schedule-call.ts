import { Router, type Request, type Response } from 'express';
import { persistLead, EMAIL_RE } from '../store';
import { requestAvailability, confirmSlot } from '../scheduling';
import { onCallScheduled } from '../crm';

const router = Router();

function validateNameEmail(req: Request, res: Response): { name: string; email: string } | null {
  const { name, email } = (req.body ?? {}) as { name?: unknown; email?: unknown };
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'El nombre es requerido.' });
    return null;
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    res.status(400).json({ error: 'El email no es válido.' });
    return null;
  }
  if (!process.env.N8N_SCHEDULE_WEBHOOK_URL) {
    res.status(503).json({ error: 'Agendar llamada no está disponible en este momento. Escríbenos a sofimh1197@gmail.com.' });
    return null;
  }
  return { name: name.trim(), email: email.trim() };
}

/** Step 1: list the next available 30-min slots — does not book anything, no name/email needed yet. */
router.post('/availability', async (_req: Request, res: Response) => {
  if (!process.env.N8N_SCHEDULE_WEBHOOK_URL) {
    return res.status(503).json({ error: 'Agendar llamada no está disponible en este momento. Escríbenos a sofimh1197@gmail.com.' });
  }
  try {
    const slots = await requestAvailability();
    return res.json({ success: true, slots });
  } catch (err) {
    console.error('[schedule-call] error consultando disponibilidad:', err);
    return res.status(502).json({ error: 'No se pudo consultar la disponibilidad. Intenta de nuevo o escríbenos a sofimh1197@gmail.com.' });
  }
});

/** Step 2: book the specific slot the person chose from the availability list. */
router.post('/confirm', async (req: Request, res: Response) => {
  const valid = validateNameEmail(req, res);
  if (!valid) return;

  const { start, end, message, service, company } = (req.body ?? {}) as {
    start?: unknown;
    end?: unknown;
    message?: unknown;
    service?: unknown;
    company?: unknown;
  };
  if (typeof start !== 'string' || !start.trim() || typeof end !== 'string' || !end.trim()) {
    return res.status(400).json({ error: 'Falta el horario elegido.' });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Cuéntanos brevemente qué necesitas construir.' });
  }
  const need = message.trim();
  const serviceValue = typeof service === 'string' && service.trim() ? service.trim() : null;
  const companyValue = typeof company === 'string' && company.trim() ? company.trim() : null;

  try {
    const result = await confirmSlot(valid.name, valid.email, start.trim(), end.trim(), need, serviceValue);
    await persistLead({
      name: valid.name,
      email: valid.email,
      message: `${need}\n\nLlamada de 30 min agendada para ${start.trim()}.${result.meetLink ? `\nEnlace de Google Meet: ${result.meetLink}` : ''}`,
      service: serviceValue,
      source: 'schedule-link',
    });
    console.info(`[schedule-call] llamada agendada para ${valid.name} <${valid.email}>: ${start.trim()}`);
    void onCallScheduled({
      fullName: valid.name,
      email: valid.email,
      companyName: companyValue,
      service: serviceValue,
      summary: need,
      startsAt: result.start,
      endsAt: result.end,
      googleMeetUrl: result.meetLink,
      googleCalendarEventId: result.eventId,
    });
    return res.json(result);
  } catch (err) {
    console.error('[schedule-call] error agendando llamada:', err);
    return res.status(502).json({ error: 'No se pudo agendar la llamada automáticamente. Intenta de nuevo o escríbenos a sofimh1197@gmail.com.' });
  }
});

export default router;
