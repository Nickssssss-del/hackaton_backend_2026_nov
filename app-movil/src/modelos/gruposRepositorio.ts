/**
 * Modelo. Grupos de apoyo públicos. La app los lee directo.
 */
import { obtenerSupabase } from "./supabase";
import type { GrupoApoyoPublico, TipoGrupoApoyo } from "./tipos";

export type GrupoApoyo = GrupoApoyoPublico;

export async function listarGrupos(): Promise<GrupoApoyo[]> {
  const { data, error } = await obtenerSupabase()
    .from("grupos_apoyo")
    .select("id, nombre, tipo, contacto, direccion, lat, lng, zona_id, verificada")
    .order("nombre");
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    id: String(fila.id),
    nombre: String(fila.nombre),
    tipo: fila.tipo as TipoGrupoApoyo,
    contacto: fila.contacto,
    direccion: fila.direccion,
    lat: fila.lat === null ? null : Number(fila.lat),
    lng: fila.lng === null ? null : Number(fila.lng),
    zonaId: fila.zona_id === null ? null : String(fila.zona_id),
    verificada: Boolean(fila.verificada),
  }));
}
