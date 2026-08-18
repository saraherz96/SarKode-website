/** Doble de pruebas mínimo para @supabase/supabase-js — implementa solo la porción encadenable
 * (`from().select().eq()...`) que usa este backend (ver backend/src/crm/*.ts y store.ts), sin
 * tocar una base de datos real. Cada prueba pasa un `handler` que decide qué devolver según la
 * tabla/operación/filtros — así ninguna prueba depende de Supabase, n8n u OpenAI reales. */

export interface QueryContext {
  table: string;
  op: 'select' | 'insert' | 'update' | 'upsert';
  payload?: unknown;
  filters: Record<string, unknown>;
  single: 'single' | 'maybeSingle' | null;
}

export type QueryHandler = (ctx: QueryContext) => { data: unknown; error: { message: string; code?: string } | null };

export type RpcHandler = (fn: string, args: Record<string, unknown>) => { data: unknown; error: { message: string } | null };

class FakeQuery implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private filters: Record<string, unknown> = {};
  private singleMode: 'single' | 'maybeSingle' | null = null;

  constructor(
    private table: string,
    private op: QueryContext['op'],
    private payload: unknown,
    private handler: QueryHandler,
  ) {}

  select(): this {
    return this;
  }
  eq(col: string, val: unknown): this {
    this.filters[col] = val;
    return this;
  }
  ilike(col: string, val: unknown): this {
    this.filters[col] = val;
    return this;
  }
  not(col: string, _op: string, val: unknown): this {
    this.filters[`not_${col}`] = val;
    return this;
  }
  in(col: string, vals: unknown): this {
    this.filters[col] = vals;
    return this;
  }
  gte(col: string, val: unknown): this {
    this.filters[`gte_${col}`] = val;
    return this;
  }
  lte(col: string, val: unknown): this {
    this.filters[`lte_${col}`] = val;
    return this;
  }
  is(col: string, val: unknown): this {
    this.filters[col] = val;
    return this;
  }
  order(): this {
    return this;
  }
  limit(): this {
    return this;
  }
  range(): this {
    return this;
  }
  maybeSingle(): this {
    this.singleMode = 'maybeSingle';
    return this;
  }
  single(): this {
    this.singleMode = 'single';
    return this;
  }

  then<T1, T2>(
    onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    const result = this.handler({ table: this.table, op: this.op, payload: this.payload, filters: this.filters, single: this.singleMode });
    return Promise.resolve(result).then(onfulfilled as never, onrejected);
  }
}

export function createFakeSupabase(handler: QueryHandler, rpcHandler?: RpcHandler) {
  return {
    from(table: string) {
      return {
        select: () => new FakeQuery(table, 'select', undefined, handler),
        insert: (payload: unknown) => new FakeQuery(table, 'insert', payload, handler),
        update: (payload: unknown) => new FakeQuery(table, 'update', payload, handler),
        upsert: (payload: unknown) => new FakeQuery(table, 'upsert', payload, handler),
        not: (col: string, op: string, val: unknown) => new FakeQuery(table, 'select', undefined, handler).not(col, op, val),
      };
    },
    rpc: (fn: string, args: Record<string, unknown>) => {
      if (!rpcHandler) return Promise.resolve({ data: null, error: null });
      return Promise.resolve(rpcHandler(fn, args));
    },
  };
}
