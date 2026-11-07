import { obtenerSupabase } from "./supabase";
import type { ZonaPublica } from "./tipos";

export async function listarZonasPublicas(): Promise<ZonaPublica[]> {
  const { data, error } = await obtenerSupabase()
    .from("zonas")
    .select("id, nombre, distrito, lat_centro, lng_centro, radio_m")
    .order("nombre");
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    id: String(fila.id),
    nombre: String(fila.nombre),
    distrito: String(fila.distrito),
    latCentro: Number(fila.lat_centro),
    lngCentro: Number(fila.lng_centro),
    radioM: Number(fila.radio_m),
  }));
}
