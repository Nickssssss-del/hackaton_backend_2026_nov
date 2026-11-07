/**
 * Modelo. Solo las columnas públicas de grupos_apoyo.
 * La revisión de reportes se hace en el panel de Supabase, no aquí.
 */
import { createClient } from "@supabase/supabase-js";

export interface GrupoPublico {
  id: string;
  nombre: string;
  tipo: string;
  contacto: string | null;
  direccion: string | null;
  verificada: boolean;
}

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && anon ? createClient(url, anon) : null;

export async function listarGrupos(): Promise<GrupoPublico[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("grupos_apoyo")
    .select("id, nombre, tipo, contacto, direccion, verificada")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as GrupoPublico[];
}
