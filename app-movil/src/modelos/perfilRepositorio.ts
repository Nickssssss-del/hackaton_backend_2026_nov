/**
 * Modelo. El vecino solo lee y edita su fila de perfiles, y lee zonas.
 */
import type { PerfilLocal, ZonaPublica } from "./tipos";
import { borrarMisDatos, obtenerSupabase } from "./supabase";
import { redondear3 } from "./geo";

export async function listarZonas(): Promise<ZonaPublica[]> {
  const { data, error } = await obtenerSupabase()
    .from("zonas")
    .select("id, nombre, distrito")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as ZonaPublica[];
}

export async function guardarPerfilNube(perfil: PerfilLocal): Promise<void> {
  const { data, error: sesionError } = await obtenerSupabase().auth.getUser();
  if (sesionError) throw sesionError;
  const id = data.user?.id;
  if (!id) throw new Error("SIN_SESION");

  const nombre = perfil.nombre?.trim() ?? "";
  const celular = perfil.celular?.trim() ?? "";
  const { error } = await obtenerSupabase().from("perfiles").upsert({
    id,
    nombre: nombre.length >= 2 ? nombre : null,
    celular: /^9\d{8}$/.test(celular) ? celular : null,
    zona_id: perfil.zonaId || null,
    lat: perfil.lat === undefined ? null : redondear3(perfil.lat),
    lng: perfil.lng === undefined ? null : redondear3(perfil.lng),
  });
  if (error) throw error;
}

export async function perfilEstaCompleto(): Promise<boolean> {
  const { data, error } = await obtenerSupabase().auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) return false;
  const perfil = await obtenerSupabase()
    .from("perfiles")
    .select("nombre, celular, zona_id")
    .eq("id", id)
    .maybeSingle();
  if (perfil.error) throw perfil.error;
  return Boolean(perfil.data?.nombre && perfil.data?.celular && perfil.data?.zona_id);
}

export { borrarMisDatos };
