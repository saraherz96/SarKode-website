import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase, type QueryContext } from './fakeSupabase';

const state = vi.hoisted(() => ({ client: null as ReturnType<typeof import('./fakeSupabase').createFakeSupabase> | null }));

vi.mock('../supabase', () => ({
  get supabase() {
    return state.client;
  },
}));

const { EMAIL_RE, PHONE_RE, persistLead, attachPhoneToLead, upsertConversation, appendMessages } = await import('../store');

describe('EMAIL_RE / PHONE_RE', () => {
  it('acepta emails con formato válido y rechaza el resto', () => {
    expect(EMAIL_RE.test('ana@example.com')).toBe(true);
    expect(EMAIL_RE.test('no-es-un-email')).toBe(false);
    expect(EMAIL_RE.test('')).toBe(false);
  });

  it('acepta teléfonos con formatos comunes y rechaza texto que no es un teléfono', () => {
    expect(PHONE_RE.test('+52 55 1234 5678')).toBe(true);
    expect(PHONE_RE.test('(55) 1234-5678')).toBe(true);
    expect(PHONE_RE.test('abc')).toBe(false);
    expect(PHONE_RE.test('123')).toBe(false); // muy corto
  });
});

describe('persistLead', () => {
  beforeEach(() => {
    state.client = null;
  });

  it('inserta el lead en Supabase con status "nuevo" cuando está configurado', async () => {
    const inserted: Record<string, unknown>[] = [];
    state.client = createFakeSupabase((ctx: QueryContext) => {
      if (ctx.table === 'leads' && ctx.op === 'insert') {
        inserted.push(ctx.payload as Record<string, unknown>);
        return { data: null, error: null };
      }
      throw new Error(`llamada inesperada: ${ctx.table}.${ctx.op}`);
    });

    const lead = await persistLead({ name: 'Ana Ruiz', email: 'ana@example.com', message: 'Hola', service: 'AI Agents', source: 'form' });

    expect(lead.status).toBe('nuevo');
    expect(lead.id).toBeTruthy();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ name: 'Ana Ruiz', email: 'ana@example.com', status: 'nuevo' });
  });
});

describe('attachPhoneToLead', () => {
  beforeEach(() => {
    state.client = null;
  });

  it('actualiza el teléfono del lead existente por email, sin crear uno nuevo', async () => {
    let updateCalls = 0;
    let insertCalls = 0;
    state.client = createFakeSupabase((ctx: QueryContext) => {
      if (ctx.table === 'leads' && ctx.op === 'select') {
        return {
          data: [{ id: 'lead-1', name: 'Ana Ruiz', email: 'ana@example.com', message: 'Hola', service: null, source: 'chat', status: 'nuevo', received_at: '2026-08-01T00:00:00.000Z' }],
          error: null,
        };
      }
      if (ctx.table === 'leads' && ctx.op === 'update') {
        updateCalls++;
        return { data: null, error: null };
      }
      if (ctx.table === 'leads' && ctx.op === 'insert') {
        insertCalls++;
        return { data: null, error: null };
      }
      throw new Error(`llamada inesperada: ${ctx.table}.${ctx.op}`);
    });

    const result = await attachPhoneToLead({ name: 'Ana Ruiz', email: 'ana@example.com', phone: '+52 55 1111 2222' });

    expect(result?.id).toBe('lead-1');
    expect(result?.phone).toBe('+52 55 1111 2222');
    expect(updateCalls).toBe(1);
    expect(insertCalls).toBe(0);
  });
});

describe('guardar conversaciones y mensajes', () => {
  beforeEach(() => {
    state.client = null;
  });

  it('upsertConversation guarda el jsonb completo de la conversación', async () => {
    const upserts: Record<string, unknown>[] = [];
    state.client = createFakeSupabase((ctx: QueryContext) => {
      if (ctx.table === 'conversations' && ctx.op === 'upsert') {
        upserts.push(ctx.payload as Record<string, unknown>);
        return { data: null, error: null };
      }
      throw new Error(`llamada inesperada: ${ctx.table}.${ctx.op}`);
    });

    await upsertConversation({ id: 'convo-1', leadId: 'lead-1', messages: [{ role: 'user', content: 'Hola' }], service: 'AI Agents' });

    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({ id: 'convo-1', lead_id: 'lead-1', service: 'AI Agents' });
  });

  it('appendMessages guarda cada turno como un renglón individual, no un solo bloque de texto', async () => {
    const inserted: Record<string, unknown>[] = [];
    state.client = createFakeSupabase((ctx: QueryContext) => {
      if (ctx.table === 'messages' && ctx.op === 'insert') {
        inserted.push(...(ctx.payload as Record<string, unknown>[]));
        return { data: null, error: null };
      }
      throw new Error(`llamada inesperada: ${ctx.table}.${ctx.op}`);
    });

    await appendMessages({
      conversationId: 'convo-1',
      turns: [
        { role: 'client', content: '¿Cuánto cuesta un agente de IA?' },
        { role: 'ai_agent', content: 'Depende del alcance, ¿qué necesitas automatizar?' },
      ],
    });

    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({ conversation_id: 'convo-1', sender_role: 'client' });
    expect(inserted[1]).toMatchObject({ conversation_id: 'convo-1', sender_role: 'ai_agent' });
  });
});
