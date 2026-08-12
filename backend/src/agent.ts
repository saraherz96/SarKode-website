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
- Si capture_lead devuelve un error (por ejemplo, email inválido), discúlpate brevemente y pide el dato correcto sin repetir toda la conversación.
- Después de que capture_lead se complete con éxito, responde con un mensaje breve y cálido confirmando que el equipo de SarKode se pondrá en contacto pronto.`;

const SCHEDULING_SYSTEM_PROMPT = `

Además, si la persona quiere agendar o reservar una llamada (dice cosas como "agendar una llamada", "quiero una reunión", "reservar 30 minutos", etc.) en vez de solo dejar sus datos:
- Pídele su nombre y su email (si no los tiene ya en la conversación).
- Llama a la función schedule_call con esos datos — el sistema elegirá automáticamente un horario disponible de 30 minutos según la disponibilidad real del calendario del equipo, así que no le pidas que elija día u hora.
- Cuando schedule_call responda con éxito, confirma la llamada mencionando el día y la hora exactos que devolvió la función, y avisa que recibirá una invitación de calendario por email con un enlace de Google Meet.
- Si schedule_call falla, discúlpate y sugiere escribir a sofimh1197@gmail.com como alternativa.
- No llames a capture_lead y a schedule_call para la misma solicitud — si agenda una llamada, con schedule_call es suficiente.`;

export const SYSTEM_PROMPT = BASE_SYSTEM_PROMPT + (SCHEDULING_ENABLED ? SCHEDULING_SYSTEM_PROMPT : '');

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

export const SCHEDULE_CALL_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'schedule_call',
    description:
      'Agenda una llamada de 30 minutos con el equipo de SarKode. El sistema busca automáticamente el próximo horario disponible en el calendario del equipo — no le preguntes a la persona qué día u hora prefiere. Llámala solo cuando ya tengas su nombre y su email, y haya confirmado que quiere agendar una llamada.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la persona que agenda la llamada.' },
        email: { type: 'string', description: 'Email de la persona, con formato válido (usuario@dominio.tld).' },
      },
      required: ['name', 'email'],
      additionalProperties: false,
    },
  },
};

/** The tool set offered to the model — scheduling is only included when the n8n webhook is configured. */
export function getTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return SCHEDULING_ENABLED ? [CAPTURE_LEAD_TOOL, SCHEDULE_CALL_TOOL] : [CAPTURE_LEAD_TOOL];
}
