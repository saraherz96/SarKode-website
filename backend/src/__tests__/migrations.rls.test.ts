import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** No hay una base de datos Postgres real disponible para las pruebas (ni el CLI de Supabase
 * está configurado en este proyecto — ver backend/supabase/migrations/README.md), así que no se
 * puede probar RLS "en caliente". Esta prueba es la red de seguridad estática: falla si alguien
 * agrega una tabla nueva al CRM y olvida activarle Row Level Security o darle policies — el
 * requisito de "un visitante nunca debe poder consultar contactos/propuestas/pagos". */

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'supabase', 'migrations');

function readAllMigrations(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  return files.map((f) => readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')).join('\n');
}

const CRM_TABLES = [
  'team_members',
  'services',
  'contacts',
  'opportunities',
  'appointments',
  'activities',
  'tasks',
  'proposals',
  'payments',
  'pipeline_history',
  'messages',
];

describe('Migraciones del CRM — RLS', () => {
  const sql = readAllMigrations();

  // 002_crm_rls.sql activa RLS para la mayoría de las tablas dentro de un DO block
  // (`foreach t in array array['contacts', 'opportunities', ...] loop ... enable row level
  // security ...`), no con un ALTER TABLE literal por tabla — así que además de buscar el
  // literal, se revisa que el nombre aparezca dentro de ese arreglo.
  const loopArrayMatch = sql.match(/foreach t in array array\[([\s\S]*?)\]/i);
  const loopedTables = (loopArrayMatch?.[1] || '').match(/'([a-z_]+)'/g)?.map((s) => s.replace(/'/g, '')) || [];

  it.each(CRM_TABLES)('la tabla %s tiene RLS activado', (table) => {
    const literal = new RegExp(`alter table public\\.${table} enable row level security`, 'i');
    expect(literal.test(sql) || loopedTables.includes(table)).toBe(true);
  });

  it('ninguna tabla de datos tiene policy ni grant para el rol "anon"', () => {
    // El helper is_team_member() sí se le otorga EXECUTE a `anon` a propósito (ver
    // 002_crm_rls.sql) — evaluado sin sesión, siempre devuelve false, no expone datos. Lo que
    // nunca debe existir es una policy o un GRANT sobre una tabla que incluya `anon`.
    expect(sql).not.toMatch(/create policy[\s\S]*?to\s+anon\b/i);
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete)[\s\S]{0,80}\bto\b[\s\S]{0,40}\banon\b/i);
  });

  it('todas las policies del equipo exigen is_team_member()', () => {
    const policyBlocks = sql.match(/create policy[\s\S]*?;/gi) || [];
    const teamPolicies = policyBlocks.filter((p) => /to authenticated/i.test(p));
    expect(teamPolicies.length).toBeGreaterThan(0);
    for (const policy of teamPolicies) {
      expect(policy).toMatch(/is_team_member\(\)/);
    }
  });
});
