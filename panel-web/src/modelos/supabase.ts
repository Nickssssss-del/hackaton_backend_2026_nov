/**
 * Modelo. Cliente único de Supabase con la clave publicable.
 * Es la única puerta del panel hacia Supabase.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;

export function cliente(): SupabaseClient {
  if (!supabase) throw new Error("FALTA_CONFIGURACION");
  return supabase;
}

/**
 * Con RLS, un update o delete sin permiso no da error: no toca filas.
 * Por eso cada escritura pide las filas afectadas y falla si no hubo ninguna.
 */
export function exigirFilas(filas: unknown[] | null): void {
  if (!filas || filas.length === 0) throw new Error("SIN_PERMISO");
}
