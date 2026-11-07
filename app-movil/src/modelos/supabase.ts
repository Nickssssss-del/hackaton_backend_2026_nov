/**
 * Modelo. Cliente de Supabase con la URL y la clave anónima.
 * La app no accede a tablas internas de autenticación ni configura claves privadas.
 */
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

let cliente: ReturnType<typeof createClient<any>> | null = null;

export function obtenerSupabase() {
  if (cliente) return cliente;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const claveAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !claveAnon) {
    throw new Error(
      "Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  cliente = createClient<any>(url, claveAnon, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return cliente;
}

/** La cuenta nace anónima. No pide celular ni correo. */
export async function asegurarSesionAnonima(): Promise<void> {
  const supabase = obtenerSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return;

  const creada = await supabase.auth.signInAnonymously();
  if (creada.error) throw creada.error;
}

/** Borra el perfil propio y, en cascada, lo que publicó. */
export async function borrarMisDatos(): Promise<void> {
  const { error } = await obtenerSupabase().rpc("borrar_mis_datos");
  if (error) throw error;
}
