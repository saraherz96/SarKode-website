/** Se corre antes de cada archivo de pruebas (ver vitest.config.ts). Limpia las variables de
 * entorno "reales" del backend (backend/.env) para que ninguna prueba pueda, por accidente,
 * escribir en el Supabase de producción, llamar a los webhooks reales de n8n, o gastar cuota de
 * OpenAI — y deja `fetch` fallando por defecto salvo que la prueba lo reemplace explícitamente. */
import { afterEach, beforeEach, vi } from 'vitest';

const RISKY_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'N8N_SCHEDULE_WEBHOOK_URL',
  'N8N_LEAD_NOTIFICATION_WEBHOOK_URL',
];

const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of RISKY_ENV_VARS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('[test] fetch de red real bloqueado — usa vi.stubGlobal("fetch", …) en la prueba.'))),
  );
});

afterEach(() => {
  for (const key of RISKY_ENV_VARS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
