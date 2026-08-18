import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Aunque las pruebas de validación de abajo nunca deberían llegar a tocar Supabase (los routers
// devuelven 400 antes de llamar a store.ts), se mockea igual como defensa en profundidad — así
// un cambio futuro que mueva la validación no arriesga escribir en el Supabase de producción
// mientras corren las pruebas.
vi.mock('../supabase', () => ({ supabase: null }));

const { default: app } = await import('../index');

describe('POST /api/contact — validación', () => {
  it('rechaza sin nombre', async () => {
    const res = await request(app).post('/api/contact').send({ email: 'ana@example.com', message: 'Hola' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nombre/i);
  });

  it('rechaza con email inválido', async () => {
    const res = await request(app).post('/api/contact').send({ name: 'Ana', email: 'no-es-un-email', message: 'Hola' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('rechaza sin mensaje', async () => {
    const res = await request(app).post('/api/contact').send({ name: 'Ana', email: 'ana@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mensaje/i);
  });
});
