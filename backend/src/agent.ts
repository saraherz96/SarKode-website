import OpenAI from 'openai';

// Unlike the Anthropic SDK, the OpenAI client throws synchronously in its constructor
// when no API key is available — and this module is imported at server startup, so an
// unguarded `new OpenAI()` would crash the whole process before the route-level "is the
// key configured?" check ever runs. Fall back to a placeholder so construction always
// succeeds; the actual API call only ever happens after that route-level check passes.
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'not-configured' });

// Configurable so you can point it at whatever current model your account has access to.
export const CHAT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/** The n8n webhook that checks Google Calendar availability and books the call. Optional — when unset, scheduling is simply not offered. */
export const SCHEDULING_ENABLED = Boolean(process.env.N8N_SCHEDULE_WEBHOOK_URL);

const BASE_SYSTEM_PROMPT = `Eres el asistente de contacto de SarKode, un estudio de software que ofrece:
- AI Agents: agentes de IA para atención al cliente, ventas, soporte interno y RRHH.
- Automatización: integraciones con n8n, APIs y workflows para eliminar trabajo manual.
- Productos: SaaS, MVPs y plataformas internas con IA, de prototipo a producto real.
- UX/UI Design: research, UI design y prototipos listos para desarrollo.

Tu objetivo es conversar de forma breve y natural con quien visita el sitio para entender qué necesita. En cuanto tengas su nombre, un email con formato válido, y un resumen claro de su proyecto o necesidad, llama a la función capture_lead para registrar el contacto — no seas exhaustivo, con esos tres datos es suficiente.

Reglas:
- Responde siempre en español, con un tono cercano, cálido y profesional, igual que el resto del sitio.
- Sé breve: 2-4 frases por turno. Nunca hagas más de una pregunta a la vez.
- No inventes ni asumas datos que la persona no te haya dado.
- Cuando tengas nombre + email + resumen, llama a capture_lead de inmediato.
- Si capture_lead devuelve un error (por ejemplo, email inválido), discúlpate brevemente y pide el dato correcto sin repetir toda la conversación.`;

const POST_CAPTURE_WITH_SCHEDULING = `
- Después de que capture_lead se complete con éxito, agradece brevemente y pregúntale si prefiere (a) que le agendes una llamada de 30 minutos para una atención más personalizada, o (b) que el equipo se ponga en contacto con ella/él directamente por teléfono.
- Si elige que la/lo contacten por teléfono, pídele su número y, en cuanto lo tengas, llama a save_phone_number con su nombre, email y teléfono.
- Si elige agendar una llamada, sigue las instrucciones de "agendar llamada" de más abajo, usando el nombre y el email que ya tienes (no se los vuelvas a pedir).
- Si save_phone_number devuelve un error, discúlpate brevemente y pide el dato correcto sin repetir toda la conversación.
- Después de que save_phone_number se complete con éxito, confirma con un mensaje breve y cálido que el equipo se pondrá en contacto pronto al número que dio.`;

const POST_CAPTURE_WITHOUT_SCHEDULING = `
- Después de que capture_lead se complete con éxito, agradece brevemente y pregúntale si quiere compartir un número de teléfono para que el equipo se ponga en contacto más rápido (es opcional).
- Si te da un número, llama a save_phone_number con su nombre, email y teléfono.
- Si save_phone_number devuelve un error, discúlpate brevemente y pide el dato correcto sin repetir toda la conversación.
- Después de que save_phone_number se complete con éxito, confirma con un mensaje breve y cálido que el equipo se pondrá en contacto pronto al número que dio.
- Si no comparte teléfono, responde con un mensaje breve y cálido confirmando que el equipo de SarKode se pondrá en contacto pronto por email.`;

const SCHEDULING_SYSTEM_PROMPT = `

Además, si la persona quiere agendar o reservar una llamada (dice cosas como "agendar una llamada", "quiero una reunión", "reservar 30 minutos", etc., ya sea desde el inicio o porque eligió esa opción después de capture_lead) en vez de solo dejar sus datos o de que la contacten por teléfono:
- Pídele su nombre, su email y un resumen breve de lo que necesita construir o resolver (si no los tienes ya en la conversación, por ejemplo porque ya pasó por capture_lead).
- Llama a la función schedule_call con esos datos — el sistema elegirá automáticamente un horario disponible de 30 minutos según la disponibilidad real del calendario del equipo, así que no le pidas que elija día u hora.
- Cuando schedule_call responda con éxito, confirma la llamada mencionando el día y la hora exactos que devolvió la función, y avisa que recibirá una invitación de calendario por email con un enlace de Google Meet.
- Si schedule_call falla, discúlpate y sugiere escribir a sofimh1197@gmail.com como alternativa.
- No llames a capture_lead y a schedule_call para la misma solicitud — si agenda una llamada, con schedule_call es suficiente.`;

export const SYSTEM_PROMPT =
  BASE_SYSTEM_PROMPT + (SCHEDULING_ENABLED ? POST_CAPTURE_WITH_SCHEDULING + SCHEDULING_SYSTEM_PROMPT : POST_CAPTURE_WITHOUT_SCHEDULING);

export const CAPTURE_LEAD_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'capture_lead',
    description:
      'Registra el contacto de un visitante interesado en los servicios de SarKode. Llámala únicamente cuando ya tengas su nombre, un email con formato válido, y un resumen de lo que necesita.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la persona que contacta.' },
        email: { type: 'string', description: 'Email de contacto, con formato válido (usuario@dominio.tld).' },
        summary: {
          type: 'string',
          description: 'Resumen conciso, en español, de lo que la persona necesita o del proyecto que describió.',
        },
        service: {
          type: 'string',
          enum: ['AI Agents', 'Automatización', 'Productos', 'UX/UI Design', 'No especificado'],
          description: 'El servicio de SarKode que mejor corresponde a su necesidad.',
        },
      },
      required: ['name', 'email', 'summary', 'service'],
      additionalProperties: false,
    },
  },
};

export const SAVE_PHONE_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'save_phone_number',
    description:
      'Guarda el número de teléfono de un contacto que ya fue registrado con capture_lead, para cuando prefiere que el equipo de SarKode se comunique con él/ella directamente en vez de (o además de) agendar una llamada. Llámala solo cuando ya tengas su nombre, su email, y el número de teléfono que compartió.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la persona.' },
        email: { type: 'string', description: 'Email de la persona, con formato válido (usuario@dominio.tld).' },
        phone: { type: 'string', description: 'Número de teléfono que la persona compartió, tal como lo escribió.' },
      },
      required: ['name', 'email', 'phone'],
      additionalProperties: false,
    },
  },
};

export const SCHEDULE_CALL_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'schedule_call',
    description:
      'Agenda una llamada de 30 minutos con el equipo de SarKode. El sistema busca automáticamente el próximo horario disponible en el calendario del equipo — no le preguntes a la persona qué día u hora prefiere. Llámala solo cuando ya tengas su nombre, su email y un resumen de lo que necesita, y haya confirmado que quiere agendar una llamada.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la persona que agenda la llamada.' },
        email: { type: 'string', description: 'Email de la persona, con formato válido (usuario@dominio.tld).' },
        summary: {
          type: 'string',
          description: 'Resumen conciso, en español, de lo que la persona necesita construir o resolver.',
        },
        service: {
          type: 'string',
          enum: ['AI Agents', 'Automatización', 'Productos', 'UX/UI Design', 'No especificado'],
          description: 'El servicio de SarKode que mejor corresponde a su necesidad.',
        },
      },
      required: ['name', 'email', 'summary', 'service'],
      additionalProperties: false,
    },
  },
};

/** The tool set offered to the model — scheduling is only included when the n8n webhook is configured. */
export function getTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const tools = [CAPTURE_LEAD_TOOL, SAVE_PHONE_TOOL];
  if (SCHEDULING_ENABLED) tools.push(SCHEDULE_CALL_TOOL);
  return tools;
}
