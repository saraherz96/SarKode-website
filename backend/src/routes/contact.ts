import { Router, type Request, type Response } from 'express';
import { persistLead, EMAIL_RE } from '../store';
import type { ContactRequestBody } from '../types';

const router = Router();

router.post('/', async (req: Request<unknown, unknown, ContactRequestBody>, res: Response) => {
  const { name, email, message, service } = req.body ?? {};

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido.' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'El email no es válido.' });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'El mensaje es requerido.' });
  }

  try {
    const lead = await persistLead({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      service: typeof service === 'string' && service.trim() ? service.trim() : null,
      source: 'form',
    });
    console.info(`[contact] nuevo mensaje de ${lead.name} <${lead.email}>${lead.service ? ` (${lead.service})` : ''}`);
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[contact] error guardando el mensaje:', err);
    return res.status(500).json({ error: 'No se pudo guardar el mensaje. Intenta de nuevo.' });
  }
});

export default router;
