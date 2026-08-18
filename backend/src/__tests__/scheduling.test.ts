import { describe, it, expect, vi, beforeEach } from 'vitest';

const { requestAvailability, confirmSlot } = await import('../scheduling');

/** "Manejar errores de n8n y Calendar" — scheduling.ts es la única pieza que habla con el
 * webhook de n8n (que a su vez llama a Google Calendar), así que se prueba mockeando `fetch`
 * en vez de golpear la red real. */
describe('scheduling — manejo de errores de n8n/Calendar', () => {
  beforeEach(() => {
    process.env.N8N_SCHEDULE_WEBHOOK_URL = 'https://n8n.example.com/webhook/schedule-call';
  });

  it('requestAvailability lanza un error legible cuando n8n responde con error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'Google Calendar no respondió' }) }),
    );

    await expect(requestAvailability()).rejects.toThrow('Google Calendar no respondió');
  });

  it('requestAvailability devuelve los horarios cuando n8n responde bien', async () => {
    const slots = [{ start: '2026-09-01T15:00:00.000Z', end: '2026-09-01T15:30:00.000Z', humanLabel: 'martes 1 de septiembre a las 9:00 am' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, slots }) }));

    const result = await requestAvailability();
    expect(result).toEqual(slots);
  });

  it('confirmSlot lanza un error legible si el webhook de n8n falla al agendar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({ error: 'No se pudo crear el evento' }) }));

    await expect(confirmSlot('Ana Ruiz', 'ana@example.com', '2026-09-01T15:00:00.000Z', '2026-09-01T15:30:00.000Z', 'Necesito un agente', 'AI Agents')).rejects.toThrow(
      'No se pudo crear el evento',
    );
  });

  it('confirmSlot devuelve meetLink y eventId cuando n8n confirma la reserva', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, meetLink: 'https://meet.google.com/abc-defg-hij', eventId: 'evt_123' }),
      }),
    );

    const result = await confirmSlot('Ana Ruiz', 'ana@example.com', '2026-09-01T15:00:00.000Z', '2026-09-01T15:30:00.000Z', 'Necesito un agente', 'AI Agents');

    expect(result).toMatchObject({ success: true, meetLink: 'https://meet.google.com/abc-defg-hij', eventId: 'evt_123' });
  });
});
