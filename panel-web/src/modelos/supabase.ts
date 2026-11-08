/**
 * Modelo. Cliente único de Supabase con la clave publicable.
 * Es la única puerta del panel hacia Supabase.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// La sesión del admin vive solo en esta pestaña (sessionStorage): al cerrar la pestaña o el
// navegador hay que entrar de nuevo.
export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, { auth: { storage: window.sessionStorage, persistSession: true } })
    : null;

// Antes la sesión se guardaba en localStorage: se borra esa copia vieja para que no quede un token guardado.
for (const clave of Object.keys(window.localStorage)) {
  if (/^sb-.+-auth-token$/.test(clave)) window.localStorage.removeItem(clave);
}

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
