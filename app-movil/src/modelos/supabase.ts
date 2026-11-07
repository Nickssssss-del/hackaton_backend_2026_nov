/**
 * Modelo. Cliente de Supabase con la URL y la clave anónima.
 * No leas auth.users desde la app y no configures service_role aquí.
 */
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const claveAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !claveAnon) {
  throw new Error(
    "Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(url, claveAnon, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** La cuenta nace anónima. No pide celular ni correo. */
export async function asegurarSesionAnonima(): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return;

  const creada = await supabase.auth.signInAnonymously();
  if (creada.error) throw creada.error;
}

/** Borra el perfil propio y, en cascada, lo que publicó. No lee auth.users. */
export async function borrarMisDatos(): Promise<void> {
  const { error } = await supabase.rpc("borrar_mis_datos");
  if (error) throw error;
}
