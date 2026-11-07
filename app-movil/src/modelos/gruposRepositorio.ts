/**
 * Modelo. Grupos de apoyo públicos. La app los lee directo.
 */
import { supabase } from "./supabase";

export interface GrupoApoyo {
  id: string;
  nombre: string;
  tipo: string;
  contacto: string | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  verificada: boolean;
}

export async function listarGrupos(): Promise<GrupoApoyo[]> {
  const { data, error } = await supabase
    .from("grupos_apoyo")
    .select("id, nombre, tipo, contacto, direccion, lat, lng, verificada")
    .order("nombre");
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    id: String(fila.id),
    nombre: String(fila.nombre),
    tipo: String(fila.tipo),
    contacto: fila.contacto,
    direccion: fila.direccion,
    lat: fila.lat === null ? null : Number(fila.lat),
    lng: fila.lng === null ? null : Number(fila.lng),
    verificada: Boolean(fila.verificada),
  }));
}
