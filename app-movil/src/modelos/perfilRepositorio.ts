/**
 * Modelo. El vecino solo lee y edita su fila de perfiles, y lee zonas.
 */
import type { PerfilLocal, ZonaPublica } from "./tipos";
import { borrarMisDatos, supabase } from "./supabase";

export async function listarZonas(): Promise<ZonaPublica[]> {
  const { data, error } = await supabase
    .from("zonas")
    .select("id, nombre, distrito")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as ZonaPublica[];
}

export async function guardarPerfilNube(perfil: PerfilLocal): Promise<void> {
  const { data, error: sesionError } = await supabase.auth.getUser();
  if (sesionError) throw sesionError;
  const id = data.user?.id;
  if (!id) throw new Error("SIN_SESION");

  const nombre = perfil.nombre?.trim() ?? "";
  const celular = perfil.celular?.trim() ?? "";
  const { error } = await supabase.from("perfiles").upsert({
    id,
    nombre: nombre.length >= 2 ? nombre : null,
    celular: /^9\d{8}$/.test(celular) ? celular : null,
    zona_id: perfil.zonaId || null,
  });
  if (error) throw error;
}

export async function perfilEstaCompleto(): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) return false;
  const perfil = await supabase
    .from("perfiles")
    .select("nombre, celular, zona_id")
    .eq("id", id)
    .maybeSingle();
  if (perfil.error) throw perfil.error;
  return Boolean(perfil.data?.nombre && perfil.data?.celular && perfil.data?.zona_id);
}

export { borrarMisDatos };
