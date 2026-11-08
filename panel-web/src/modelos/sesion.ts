/**
 * Modelo. Sesión del admin con Supabase Auth (correo y contraseña).
 * El permiso lo decide la base con rpc('es_admin'); el panel no lee la tabla admins.
 */
import type { Session } from "@supabase/supabase-js";
import { cliente, supabase } from "./supabase";

export const configurado = supabase !== null;

export async function sesionActual(): Promise<Session | null> {
  const { data, error } = await cliente().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function entrarConCorreo(correo: string, clave: string): Promise<Session> {
  const { data, error } = await cliente().auth.signInWithPassword({
    email: correo.trim(),
    password: clave,
  });
  if (error) throw error;
  return data.session;
}

export async function esAdmin(): Promise<boolean> {
  const { data, error } = await cliente().rpc("es_admin");
  if (error) throw error;
  return data === true;
}

export async function cerrarSesion(): Promise<void> {
  const { error } = await cliente().auth.signOut();
  if (error) throw error;
}

/** Avisa cuando la sesión termina (salir, token vencido). Devuelve cómo dejar de escuchar. */
export function alTerminarSesion(aviso: () => void): () => void {
  const { data } = cliente().auth.onAuthStateChange((evento, sesion) => {
    if (evento === "SIGNED_OUT" || !sesion) aviso();
  });
  return () => data.subscription.unsubscribe();
}
