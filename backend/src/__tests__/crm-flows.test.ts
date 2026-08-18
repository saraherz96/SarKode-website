import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase, type QueryContext } from './fakeSupabase';

const state = vi.hoisted(() => ({ client: null as ReturnType<typeof import('./fakeSupabase').createFakeSupabase> | null }));

vi.mock('../supabase', () => ({
  get supabase() {
    return state.client;
  },
}));

const { onContactRequest, onCallScheduled } = await import('../crm/index');

/** Handler genérico que resuelve las tablas que tocan los dos flujos de orquestación
 * (contacts, services, opportunities, activities, tasks, appointments, conversations) y va
 * anotando cada insert en `calls` para que las pruebas verifiquen qué se creó. */
function buildHandler(calls: Record<string, Record<string, unknown>[]>) {
  return (ctx: QueryContext) => {
    calls[`${ctx.table}.${ctx.op}`] ??= [];
    if (ctx.payload) calls[`${ctx.table}.${ctx.op}`].push(ctx.payload as Record<string, unknown>);

    if (ctx.table === 'contacts' && ctx.op === 'select') return { data: null, error: null };
    if (ctx.table === 'contacts' && ctx.op === 'insert') {
      return { data: { id: 'contact-1', full_name: 'Diego Paredes', email: 'diego@example.com', phone: null }, error: null };
    }
    if (ctx.table === 'services' && ctx.op === 'select') return { data: { id: 'service-ai-agents' }, error: null };
    if (ctx.table === 'opportunities' && ctx.op === 'select') return { data: null, error: null };
    if (ctx.table === 'opportunities' && ctx.op === 'insert') {
      return { data: { id: 'opp-1', contact_id: 'contact-1', status: (ctx.payload as { status: string }).status }, error: null };
    }
    if (ctx.table === 'activities' && ctx.op === 'insert') return { data: null, error: null };
    if (ctx.table === 'tasks' && ctx.op === 'insert') return { data: null, error: null };
    if (ctx.table === 'appointments' && ctx.op === 'insert') return { data: null, error: null };
    if (ctx.table === 'conversations' && ctx.op === 'update') return { data: null, error: null };
    throw new Error(`llamada inesperada en la prueba: ${ctx.table}.${ctx.op}`);
  };
}

describe('onContactRequest — flujo "Solicitud de contacto"', () => {
  beforeEach(() => {
    state.client = null;
  });

  it('crea contacto + oportunidad pending_contact + actividad + tarea de seguimiento', async () => {
    const calls: Record<string, Record<string, unknown>[]> = {};
    state.client = createFakeSupabase(buildHandler(calls));

    await onContactRequest({
      fullName: 'Diego Paredes',
      email: 'diego@example.com',
      service: 'AI Agents',
      message: 'Quiero un agente de WhatsApp.',
      source: 'form',
    });

    expect(calls['contacts.insert']).toHaveLength(1);
    expect(calls['opportunities.insert']).toHaveLength(1);
    expect(calls['opportunities.insert'][0].status).toBe('pending_contact');
    expect(calls['activities.insert']).toHaveLength(1);
    expect(calls['activities.insert'][0]).toMatchObject({ activity_type: 'contact_created' });
    expect(calls['tasks.insert']).toHaveLength(1);
    expect(calls['tasks.insert'][0].due_at).toBeTruthy();
  });

  it('nunca lanza, aunque Supabase no esté configurado', async () => {
    state.client = null;
    await expect(
      onContactRequest({ fullName: 'Sin Supabase', email: 'x@example.com', message: 'hola', source: 'form' }),
    ).resolves.toBeUndefined();
  });
});

describe('onCallScheduled — flujo "Agendamiento de llamada"', () => {
  beforeEach(() => {
    state.client = null;
  });

  it('crea contacto + oportunidad call_scheduled + cita con Meet URL y Event ID', async () => {
    const calls: Record<string, Record<string, unknown>[]> = {};
    state.client = createFakeSupabase(buildHandler(calls));

    await onCallScheduled({
      fullName: 'Diego Paredes',
      email: 'diego@example.com',
      service: 'AI Agents',
      summary: 'Automatizar conciliación de facturas.',
      startsAt: '2026-09-01T15:00:00.000Z',
      endsAt: '2026-09-01T15:30:00.000Z',
      googleMeetUrl: 'https://meet.google.com/abc-defg-hij',
      googleCalendarEventId: 'evt_123',
    });

    expect(calls['opportunities.insert'][0].status).toBe('call_scheduled');
    expect(calls['appointments.insert']).toHaveLength(1);
    expect(calls['appointments.insert'][0]).toMatchObject({
      google_meet_url: 'https://meet.google.com/abc-defg-hij',
      google_calendar_event_id: 'evt_123',
      starts_at: '2026-09-01T15:00:00.000Z',
    });
    expect(calls['activities.insert'][0]).toMatchObject({ activity_type: 'appointment_scheduled' });
  });
});
