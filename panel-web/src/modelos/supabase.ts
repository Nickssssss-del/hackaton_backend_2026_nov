/**
 * Modelo. Cliente único de Supabase con la clave publicable.
 * Es la única puerta del panel hacia Supabase.
 *
 * Modo demo: el panel funciona con datos de ejemplo en memoria (ver demo.ts),
 * sin tocar Supabase. Sirve para presentar el panel y para probar la interfaz.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Por qué no hay cliente, si no lo hay. Una URL mal escrita no debe dejar
 * la página en blanco: el panel lo dice en la pantalla de acceso.
 */
export const problemaConfiguracion: string | null = (() => {
  if (!url || !anon) return "FALTA_CONFIGURACION";
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) {
    return "URL_NO_VALIDA";
  }
  if (/^(sb_secret_|service_role)/.test(anon)) return "CLAVE_SECRETA";
  return null;
})();

function crearCliente(): SupabaseClient | null {
  if (problemaConfiguracion) return null;
  try {
    return createClient(url!, anon!);
  } catch {
    return null;
  }
}

export const supabase: SupabaseClient | null = crearCliente();

export function cliente(): SupabaseClient {
  if (!supabase) throw new Error(problemaConfiguracion ?? "FALTA_CONFIGURACION");
  return supabase;
}

/**
 * Con RLS, un update o delete sin permiso no da error: no toca filas.
 * Por eso cada escritura pide las filas afectadas y falla si no hubo ninguna.
 */
export function exigirFilas(filas: unknown[] | null): void {
  if (!filas || filas.length === 0) throw new Error("SIN_PERMISO");
}

const CLAVE_DEMO = "panel-vecinos-demo";

/** El modo demo existe al desarrollar (npm run dev) o si se pide con VITE_MOSTRAR_DEMO=true. */
export const demoPermitido = import.meta.env.DEV || import.meta.env.VITE_MOSTRAR_DEMO === "true";

function leerDemo(): boolean {
  if (!demoPermitido) return false;
  try {
    return sessionStorage.getItem(CLAVE_DEMO) === "1";
  } catch {
    return false;
  }
}

let demo = leerDemo();

/** true si el panel usa los datos de ejemplo en vez de Supabase. */
export const enDemo = () => demo;

export function fijarDemo(activo: boolean): void {
  demo = activo && demoPermitido;
  try {
    if (activo) sessionStorage.setItem(CLAVE_DEMO, "1");
    else sessionStorage.removeItem(CLAVE_DEMO);
  } catch {
    // Sin sessionStorage el modo demo dura hasta recargar la página.
  }
}

/** Pequeña espera en demo para que la interfaz muestre sus estados de carga. */
export const esperaDemo = (ms = 250) => new Promise<void>((listo) => setTimeout(listo, ms));
