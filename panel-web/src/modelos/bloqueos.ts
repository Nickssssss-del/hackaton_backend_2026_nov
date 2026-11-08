/**
 * Modelo. Bloqueos de usuarios y reportes de personas. Solo con es_admin()
 * (bloqueos_admin, reportes_com_leer_admin y reportes_com_borrar_admin).
 */
import { cliente, exigirFilas } from "./supabase";

export interface Bloqueo {
  user_id: string;
  motivo: string | null;
  creado_por: string | null;
  creado_en: string;
}

export interface ReportePersona {
  id: string;
  usuario_id: string;
  motivo: string;
  creado_en: string;
}

export async function listarBloqueos(): Promise<Bloqueo[]> {
  const { data, error } = await cliente()
    .from("bloqueos")
    .select("user_id, motivo, creado_por, creado_en")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Bloqueo[];
}

/** Reportes que apuntan a una persona (no a una publicación ni a un comentario). */
export async function listarReportesDePersonas(): Promise<ReportePersona[]> {
  const { data, error } = await cliente()
    .from("reportes_comunidad")
    .select("id, usuario_id, motivo, creado_en")
    .not("usuario_id", "is", null)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReportePersona[];
}

export async function desbloquear(userId: string): Promise<void> {
  const { data, error } = await cliente().from("bloqueos").delete().eq("user_id", userId).select("user_id");
  if (error) throw error;
  exigirFilas(data);
}

export async function descartarReporte(id: string): Promise<void> {
  const { data, error } = await cliente().from("reportes_comunidad").delete().eq("id", id).select("id");
  if (error) throw error;
  exigirFilas(data);
}

export async function idDeLaSesion(): Promise<string | null> {
  const { data } = await cliente().auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Igual que public.nombre_corto: un solo nombre se deja entero;
 * con apellido, primer nombre e inicial («Ana Q.»). Vacío o nulo no tiene corto.
 */
export function nombreCorto(nombre: string | null): string | null {
  if (nombre == null) return null;
  const recortado = nombre.replace(/^ +| +$/g, "");
  if (recortado === "") return null;
  const segunda = recortado.split(" ")[1] ?? "";
  if (segunda === "") return recortado;
  const inicial = (recortado.replace(/\s+/g, " ").split(" ")[1] ?? "").slice(0, 1).toUpperCase();
  return `${recortado.split(" ")[0]} ${inicial}.`;
}

/** Solo id y nombre. El celular y la zona no salen de la base. */
export async function nombresCortos(ids: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();
  const { data, error } = await cliente().from("perfiles").select("id, nombre").in("id", unicos);
  if (error) throw error;
  const mapa = new Map<string, string>();
  for (const fila of (data ?? []) as { id: string; nombre: string | null }[]) {
    const corto = nombreCorto(fila.nombre);
    if (corto) mapa.set(fila.id, corto);
  }
  return mapa;
}

/** Ids de los usuarios bloqueados, para marcar «bloqueado» en otras pantallas. */
export async function listarIdsBloqueados(): Promise<Set<string>> {
  const { data, error } = await cliente().from("bloqueos").select("user_id");
  if (error) throw error;
  return new Set((data ?? []).map((fila: { user_id: string }) => fila.user_id));
}

/** Bloquea con un motivo de 1 a 140 caracteres. creado_por es el admin de la sesión (la base no lo pone). */
export async function bloquear(userId: string, motivo: string): Promise<void> {
  const sb = cliente();
  const { data: usuario, error: errorUsuario } = await sb.auth.getUser();
  if (errorUsuario) throw errorUsuario;
  const { error } = await sb
    .from("bloqueos")
    .insert({ user_id: userId, motivo: motivo.trim(), creado_por: usuario.user.id })
    .select("user_id");
  if (error?.code === "23505") throw new Error("YA_BLOQUEADO");
  if (error) throw error;
}
