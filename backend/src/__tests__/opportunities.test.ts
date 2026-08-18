import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase, type QueryContext, type RpcHandler } from './fakeSupabase';

const state = vi.hoisted(() => ({ client: null as ReturnType<typeof import('./fakeSupabase').createFakeSupabase> | null }));

vi.mock('../supabase', () => ({
  get supabase() {
    return state.client;
  },
}));

const { findOrCreateOpportunity, changeOpportunityStatus } = await import('../crm/opportunities');

describe('findOrCreateOpportunity', () => {
  beforeEach(() => {
    state.client = null;
  });

  it('crea una oportunidad nueva en pending_contact para una solicitud de contacto', async () => {
    const inserted: Record<string, unknown>[] = [];
    const handler = (ctx: QueryContext) => {
      if (ctx.table === 'opportunities' && ctx.op === 'select') return { data: null, error: null }; // sin oportunidad reciente
      if (ctx.table === 'opportunities' && ctx.op === 'insert') {
        inserted.push(ctx.payload as Record<string, unknown>);
        return { data: { id: 'opp-1', contact_id: 'contact-1', status: 'pending_contact' }, error: null };
      }
      throw new Error(`llamada inesperada: ${ctx.table}.${ctx.op}`);
    };
    state.client = createFakeSupabase(handler);

    const opp = await findOrCreateOpportunity({
      contactId: 'contact-1',
      serviceId: null,
      title: 'AI Agents — Ana Ruiz',
      status: 'pending_contact',
    });

    expect(opp?.id).toBe('opp-1');
    expect(inserted).toHaveLength(1);
    expect(inserted[0].status).toBe('pending_contact');
  });

  it('reutiliza una oportunidad reciente abierta del mismo contacto/servicio en vez de duplicarla', async () => {
    let insertCalls = 0;
    let rpcCalls = 0;
    const handler = (ctx: QueryContext) => {
      if (ctx.table === 'opportunities' && ctx.op === 'select') {
        return { data: { id: 'opp-recent', contact_id: 'contact-1', status: 'pending_contact' }, error: null };
      }
      if (ctx.table === 'opportunities' && ctx.op === 'update') return { data: null, error: null };
      if (ctx.table === 'opportunities' && ctx.op === 'insert') {
        insertCalls++;
        return { data: { id: 'should-not-happen' }, error: null };
      }
      throw new Error(`llamada inesperada: ${ctx.table}.${ctx.op}`);
    };
    const rpcHandler: RpcHandler = () => {
      rpcCalls++;
      return { data: null, error: null };
    };
    state.client = createFakeSupabase(handler, rpcHandler);

    const opp = await findOrCreateOpportunity({
      contactId: 'contact-1',
      serviceId: null,
      title: 'AI Agents — Ana Ruiz (otra vez)',
      status: 'pending_contact',
    });

    expect(opp?.id).toBe('opp-recent');
    expect(insertCalls).toBe(0);
    expect(rpcCalls).toBe(0); // mismo status, no debería llamar a crm_change_opportunity_status
  });
});

describe('changeOpportunityStatus', () => {
  beforeEach(() => {
    state.client = null;
  });

  it('cambia la etapa vía la función transaccional crm_change_opportunity_status (no un UPDATE directo)', async () => {
    let calledFn = '';
    let calledArgs: Record<string, unknown> = {};
    state.client = createFakeSupabase(
      () => {
        throw new Error('no debería tocar las tablas directamente');
      },
      (fn, args) => {
        calledFn = fn;
        calledArgs = args;
        return { data: null, error: null };
      },
    );

    await changeOpportunityStatus('opp-1', 'won', 'Cliente firmó');

    expect(calledFn).toBe('crm_change_opportunity_status');
    expect(calledArgs).toMatchObject({ p_opportunity_id: 'opp-1', p_new_status: 'won', p_notes: 'Cliente firmó' });
  });
});
