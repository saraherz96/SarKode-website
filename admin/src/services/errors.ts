import type { PostgrestError } from '@supabase/supabase-js';

/** Uniforma los errores de Supabase/PostgREST en un Error normal con un mensaje legible, para
 * que cada página solo tenga que hacer `catch (err) { setError(err.message) }`. */
export function asError(error: PostgrestError | Error | null | undefined, fallback: string): Error {
  if (!error) return new Error(fallback);
  return new Error(error.message || fallback);
}
