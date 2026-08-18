import { Router, type Request, type Response } from 'express';
import OpenAI from 'openai';
import { openai, CHAT_MODEL, SYSTEM_PROMPT, getTools } from '../agent';
import { persistLead, upsertConversation, appendMessages, attachPhoneToLead, EMAIL_RE, PHONE_RE, type LeadRecord } from '../store';
import { requestAvailability, confirmSlot } from '../scheduling';
import { onContactRequest, onCallScheduled } from '../crm';

const router = Router();

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface CaptureLeadInput {
  name: string;
  email: string;
  summary: string;
  service: string;
  company?: string;
}

interface ScheduleCallInput {
  name: string;
  email: string;
  summary: string;
  service: string;
  company?: string;
}

interface SavePhoneInput {
  name: string;
  email: string;
  phone: string;
}

interface CallScheduled {
  humanLabel: string;
  start: string;
  end: string;
}

function isChatTurn(v: unknown): v is ChatTurn {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  return (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string';
}

function parseToolArgs<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function askOpenAI(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) {
  return openai.chat.completions.create({
    model: CHAT_MODEL,
    max_tokens: 1024,
    tools: getTools(),
    messages,
  });
}

router.post('/', async (req: Request, res: Response) => {
  const { messages, conversationId } = (req.body ?? {}) as { messages?: unknown; conversationId?: unknown };

  if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isChatTurn)) {
    return res.status(400).json({ error: 'Se requiere un arreglo "messages" con turnos { role, content }.' });
  }
  const convoId = typeof conversationId === 'string' && conversationId.trim() ? conversationId.trim() : null;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'El asistente de IA no está configurado en el servidor (falta OPENAI_API_KEY).' });
  }

  const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
  ];

  try {
    let completion = await askOpenAI(history);
    let message = completion.choices[0].message;
    let lead: LeadRecord | null = null;
    let callScheduled: CallScheduled | null = null;
    let phoneSaved: string | null = null;
    let conversationLeadId: string | null = null;

    // At most one round of tool calls per request. The model may request multiple
    // tools in one turn — execute them all, then return one 'tool' message per call.
    if (message.tool_calls && message.tool_calls.length > 0) {
      history.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const { name, arguments: rawArgs } = toolCall.function;

        if (name === 'capture_lead') {
          const input = parseToolArgs<CaptureLeadInput>(rawArgs);
          const email = (input?.email || '').trim();
          if (input && EMAIL_RE.test(email) && input.name?.trim() && input.summary?.trim()) {
            lead = await persistLead({
              name: input.name.trim(),
              email,
              message: input.summary.trim(),
              service: input.service?.trim() || null,
              source: 'chat',
            });
            conversationLeadId = lead.id;
            console.info(`[chat] lead capturado: ${lead.name} <${lead.email}>${lead.service ? ` (${lead.service})` : ''}`);
            void onContactRequest({
              fullName: lead.name,
              email: lead.email,
              phone: lead.phone,
              companyName: input.company?.trim() || null,
              service: lead.service,
              message: lead.message,
              source: 'chat',
              leadId: lead.id,
              conversationId: convoId,
            });
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Lead guardado correctamente. El equipo de SarKode lo revisará pronto.',
            });
          } else {
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Error: el email no tiene un formato válido u otro dato requerido falta. Pide el dato correcto antes de reintentar.',
            });
          }
        } else if (name === 'schedule_call') {
          const input = parseToolArgs<ScheduleCallInput>(rawArgs);
          const email = (input?.email || '').trim();
          if (!input || !EMAIL_RE.test(email) || !input.name?.trim() || !input.summary?.trim()) {
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Error: el nombre, el email o el resumen de lo que necesita no son válidos. Pide el dato correcto antes de reintentar.',
            });
            continue;
          }
          try {
            // The chat auto-books the earliest open slot — the "pick a time" UI lives in
            // the standalone scheduling form, which calls /availability and /confirm directly.
            const slots = await requestAvailability();
            if (slots.length === 0) throw new Error('No hay horarios disponibles en los próximos días.');
            const chosen = slots[0];
            const summary = input.summary.trim();
            const service = input.service?.trim() || null;
            const { meetLink, eventId } = await confirmSlot(input.name.trim(), email, chosen.start, chosen.end, summary, service);
            callScheduled = { humanLabel: chosen.humanLabel, start: chosen.start, end: chosen.end };
            const callLead = await persistLead({
              name: input.name.trim(),
              email,
              message: `${summary}\n\nLlamada de 30 min agendada para ${chosen.humanLabel}.${meetLink ? `\nEnlace de Google Meet: ${meetLink}` : ''}`,
              service,
              source: 'chat',
            });
            conversationLeadId = callLead.id;
            console.info(`[chat] llamada agendada para ${input.name.trim()} <${email}>: ${chosen.humanLabel}`);
            void onCallScheduled({
              fullName: input.name.trim(),
              email,
              companyName: input.company?.trim() || null,
              service,
              summary,
              startsAt: chosen.start,
              endsAt: chosen.end,
              googleMeetUrl: meetLink,
              googleCalendarEventId: eventId,
              leadId: callLead.id,
              conversationId: convoId,
            });
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Llamada agendada con éxito para ${chosen.humanLabel}. Se envió invitación de calendario a ${email}.`,
            });
          } catch (err) {
            console.error('[chat] error agendando llamada:', err);
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Error: no se pudo agendar la llamada automáticamente. Discúlpate y sugiere escribir a sofimh1197@gmail.com.',
            });
          }
        } else if (name === 'save_phone_number') {
          const input = parseToolArgs<SavePhoneInput>(rawArgs);
          const email = (input?.email || '').trim();
          const phone = (input?.phone || '').trim();
          if (!input || !EMAIL_RE.test(email) || !input.name?.trim() || !PHONE_RE.test(phone)) {
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Error: el nombre, el email o el teléfono no son válidos. Pide el dato correcto antes de reintentar.',
            });
            continue;
          }
          try {
            const updated = await attachPhoneToLead({ name: input.name.trim(), email, phone });
            phoneSaved = phone;
            if (updated) {
              conversationLeadId = updated.id;
              void onContactRequest({
                fullName: updated.name,
                email: updated.email,
                phone: updated.phone,
                service: updated.service,
                message: updated.message,
                source: 'phone-preference',
                leadId: updated.id,
                conversationId: convoId,
              });
            }
            console.info(`[chat] teléfono guardado para ${input.name.trim()} <${email}>: ${phone}`);
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Teléfono guardado correctamente. El equipo de SarKode se pondrá en contacto pronto.',
            });
          } catch (err) {
            console.error('[chat] error guardando teléfono:', err);
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Error: no se pudo guardar el teléfono. Discúlpate y sugiere escribir a sofimh1197@gmail.com.',
            });
          }
        } else {
          history.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Error: función desconocida "${name}".`,
          });
        }
      }

      completion = await askOpenAI(history);
      message = completion.choices[0].message;
    }

    const reply = message.content?.trim() || 'Gracias por tu mensaje.';

    if (convoId) {
      const lastTurn = messages[messages.length - 1];
      const newTurns: { role: 'client' | 'ai_agent'; content: string }[] = [];
      if (lastTurn?.role === 'user') newTurns.push({ role: 'client', content: lastTurn.content });
      newTurns.push({ role: 'ai_agent', content: reply });

      // Encadenado (no bloquea la respuesta): appendMessages necesita que el renglón de la
      // conversación ya exista (FK conversations → messages), así que corre después del upsert.
      void upsertConversation({
        id: convoId,
        leadId: conversationLeadId,
        messages: [...messages, { role: 'assistant', content: reply }],
        service: lead?.service ?? null,
      })
        .then(() => appendMessages({ conversationId: convoId, turns: newTurns }))
        .catch((err) => {
          console.error('[chat] error guardando conversación:', err instanceof Error ? err.message : err);
        });
    }

    return res.json({
      reply,
      leadCaptured: lead ? { name: lead.name, email: lead.email, service: lead.service } : null,
      callScheduled,
      phoneSaved,
    });
  } catch (err) {
    if (err instanceof OpenAI.AuthenticationError) {
      console.error('[chat] clave de API inválida:', err.message);
      return res.status(503).json({ error: 'El asistente de IA no está disponible en este momento.' });
    }
    if (err instanceof OpenAI.RateLimitError) {
      console.error('[chat] rate limited:', err.message);
      return res.status(429).json({ error: 'El asistente está recibiendo muchas solicitudes. Intenta de nuevo en un momento.' });
    }
    console.error('[chat] error inesperado:', err);
    return res.status(502).json({ error: 'No se pudo conectar con el asistente. Intenta de nuevo.' });
  }
});

export default router;
