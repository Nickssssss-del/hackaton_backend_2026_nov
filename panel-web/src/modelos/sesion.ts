/**
 * Modelo. Sesión del admin con Supabase Auth (correo y contraseña).
 * El permiso lo decide la base con rpc('es_admin'); el panel no lee la tabla admins.
 * En modo demo no hay Supabase: la sesión es local y siempre es admin.
 */
import type { Session } from "@supabase/supabase-js";
import { DEMO_CORREO, reiniciarDemo } from "./demo";
import { cliente, demoPermitido, enDemo, fijarDemo, supabase } from "./supabase";

export const configurado = supabase !== null;

export interface SesionPanel {
  correo: string | null;
}

export async function sesionActual(): Promise<SesionPanel | null> {
  if (enDemo()) return { correo: DEMO_CORREO };
  if (!configurado) return null;
  const { data, error } = await cliente().auth.getSession();
  if (error) throw error;
  return data.session ? { correo: data.session.user.email ?? null } : null;
}

export async function entrarConCorreo(correo: string, clave: string): Promise<Session> {
  const { data, error } = await cliente().auth.signInWithPassword({
    email: correo.trim(),
    password: clave,
  });
  if (error) throw error;
  return data.session;
}

/** Entra con datos de ejemplo. `admin = false` simula una cuenta sin permiso. */
export function entrarEnDemo(admin: boolean): SesionPanel | null {
  if (!admin || !demoPermitido) return null;
  reiniciarDemo();
  fijarDemo(true);
  return { correo: DEMO_CORREO };
}

export async function esAdmin(): Promise<boolean> {
  if (enDemo()) return true;
  const { data, error } = await cliente().rpc("es_admin");
  if (error) throw error;
  return data === true;
}

export async function cerrarSesion(): Promise<void> {
  if (enDemo()) {
    fijarDemo(false);
    return;
  }
  if (!configurado) return;
  const { error } = await cliente().auth.signOut();
  if (error) throw error;
}

/** Avisa cuando la sesión termina (salir, token vencido). Devuelve cómo dejar de escuchar. */
export function alTerminarSesion(aviso: () => void): () => void {
  if (!configurado) return () => {};
  const { data } = cliente().auth.onAuthStateChange((evento, sesion) => {
    if (enDemo()) return;
    if (evento === "SIGNED_OUT" || !sesion) aviso();
  });
  return () => data.subscription.unsubscribe();
}
