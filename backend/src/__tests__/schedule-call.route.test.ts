import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../supabase', () => ({ supabase: null }));

const { default: app } = await import('../index');

describe('POST /api/schedule-call — validación y disponibilidad', () => {
  it('responde 503 cuando N8N_SCHEDULE_WEBHOOK_URL no está configurado (setup.ts lo limpia)', async () => {
    const res = await request(app).post('/api/schedule-call/availability').send({});
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/no está disponible/i);
  });

  it('POST /confirm rechaza sin nombre/email antes de intentar agendar', async () => {
    process.env.N8N_SCHEDULE_WEBHOOK_URL = 'https://n8n.example.com/webhook/schedule-call';
    const res = await request(app).post('/api/schedule-call/confirm').send({ start: '2026-09-01T15:00:00.000Z', end: '2026-09-01T15:30:00.000Z', message: 'Hola' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nombre/i);
  });

  it('POST /confirm rechaza sin el horario elegido', async () => {
    process.env.N8N_SCHEDULE_WEBHOOK_URL = 'https://n8n.example.com/webhook/schedule-call';
    const res = await request(app).post('/api/schedule-call/confirm').send({ name: 'Ana', email: 'ana@example.com', message: 'Hola' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/horario/i);
  });
});
