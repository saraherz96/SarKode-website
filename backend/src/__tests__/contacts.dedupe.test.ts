import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase, type QueryContext } from './fakeSupabase';

const state = vi.hoisted(() => ({ client: null as ReturnType<typeof import('./fakeSupabase').createFakeSupabase> | null }));

vi.mock('../supabase', () => ({
  get supabase() {
    return state.client;
  },
}));

const { findOrCreateContact } = await import('../crm/contacts');

describe('findOrCreateContact — evita contactos duplicados', () => {
  beforeEach(() => {
    state.client = null;
  });

  it('crea un contacto nuevo cuando no existe ningún email/teléfono coincidente', async () => {
    const inserted: unknown[] = [];
    const handler = (ctx: QueryContext) => {
      if (ctx.table === 'contacts' && ctx.op === 'select') return { data: null, error: null };
      if (ctx.table === 'contacts' && ctx.op === 'insert') {
        inserted.push(ctx.payload);
        return { data: { id: 'contact-1', full_name: 'Ana Ruiz', email: 'ana@example.com', phone: null }, error: null };
      }
      throw new Error(`llamada inesperada: ${ctx.table}.${ctx.op}`);
    };
    state.client = createFakeSupabase(handler);

    const contact = await findOrCreateContact({ fullName: 'Ana Ruiz', email: 'ana@example.com', source: 'website_form' });

    expect(contact?.id).toBe('contact-1');
    expect(inserted).toHaveLength(1);
  });

  it('reutiliza el contacto existente por email en vez de crear uno duplicado', async () => {
    let insertCalls = 0;
    const handler = (ctx: QueryContext) => {
      if (ctx.table === 'contacts' && ctx.op === 'select') {
        return { data: { id: 'contact-existing', full_name: 'Ana Ruiz', email: 'ana@example.com', phone: null }, error: null };
      }
      if (ctx.table === 'contacts' && ctx.op === 'update') return { data: null, error: null };
      if (ctx.table === 'contacts' && ctx.op === 'insert') {
        insertCalls++;
        return { data: { id: 'should-not-happen' }, error: null };
      }
      throw new Error(`llamada inesperada: ${ctx.table}.${ctx.op}`);
    };
    state.client = createFakeSupabase(handler);

    const contact = await findOrCreateContact({ fullName: 'Ana Ruiz', email: 'Ana@Example.com', source: 'website_chat' });

    expect(contact?.id).toBe('contact-existing');
    expect(insertCalls).toBe(0);
  });

  it('reutiliza el contacto existente por teléfono normalizado, aunque el formato varíe', async () => {
    const handler = (ctx: QueryContext) => {
      if (ctx.table === 'contacts' && ctx.op === 'select') {
        // Primera búsqueda es por email (no aplica, no hay email); la búsqueda por teléfono trae
        // un solo contacto ya guardado con otro formato de teléfono.
        return {
          data: [{ id: 'contact-phone', full_name: 'Carlos Peña', email: null, phone: '(55) 1234-5678' }],
          error: null,
        };
      }
      if (ctx.table === 'contacts' && ctx.op === 'update') return { data: null, error: null };
      throw new Error(`llamada inesperada: ${ctx.table}.${ctx.op}`);
    };
    state.client = createFakeSupabase(handler);

    const contact = await findOrCreateContact({ fullName: 'Carlos Peña', phone: '55 1234 5678', source: 'website_form' });

    expect(contact?.id).toBe('contact-phone');
  });

  it('no crea nada si no hay ni email ni teléfono', async () => {
    state.client = createFakeSupabase(() => {
      throw new Error('no debería llamar a Supabase sin email/teléfono');
    });

    const contact = await findOrCreateContact({ fullName: 'Sin datos', source: 'manual' });
    expect(contact).toBeNull();
  });
});
