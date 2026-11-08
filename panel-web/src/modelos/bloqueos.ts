/**
 * Modelo. Bloqueos de usuarios y reportes de personas. Solo con es_admin()
 * (bloqueos_admin, reportes_com_leer_admin y reportes_com_borrar_admin).
 */
import { DEMO_ADMIN_ID, demo } from "./demo";
import { cliente, enDemo, esperaDemo, exigirFilas } from "./supabase";

export interface Bloqueo {
  user_id: string;
  motivo: string | null;
  creado_por: string | null;
  creado_en: string;
  /** Solo en demo: el admin no puede leer perfiles ajenos. */
  nombre?: string | null;
}

export interface ReportePersona {
  id: string;
  usuario_id: string;
  motivo: string;
  creado_en: string;
  /** Solo en demo. */
  nombre?: string | null;
  /** Solo en demo: de dónde viene el reporte. */
  contexto?: string | null;
}

export async function listarBloqueos(): Promise<Bloqueo[]> {
  if (enDemo()) {
    await esperaDemo();
    return [...demo().bloqueos];
  }
  const { data, error } = await cliente()
    .from("bloqueos")
    .select("user_id, motivo, creado_por, creado_en")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Bloqueo[];
}

/** Reportes que apuntan a una persona (no a una publicación ni a un comentario). */
export async function listarReportesDePersonas(): Promise<ReportePersona[]> {
  if (enDemo()) {
    await esperaDemo();
    return [...demo().reportesPersonas];
  }
  const { data, error } = await cliente()
    .from("reportes_comunidad")
    .select("id, usuario_id, motivo, creado_en")
    .not("usuario_id", "is", null)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReportePersona[];
}

export async function desbloquear(userId: string): Promise<void> {
  if (enDemo()) {
    await esperaDemo();
    demo().bloqueos = demo().bloqueos.filter((b) => b.user_id !== userId);
    return;
  }
  const { data, error } = await cliente().from("bloqueos").delete().eq("user_id", userId).select("user_id");
  if (error) throw error;
  exigirFilas(data);
}

/** Descarta todos los reportes indicados (los de una persona). */
export async function descartarReportes(ids: string[]): Promise<void> {
  if (enDemo()) {
    await esperaDemo();
    demo().reportesPersonas = demo().reportesPersonas.filter((r) => !ids.includes(r.id));
    return;
  }
  const { data, error } = await cliente().from("reportes_comunidad").delete().in("id", ids).select("id");
  if (error) throw error;
  exigirFilas(data);
}

export async function idDeLaSesion(): Promise<string | null> {
  if (enDemo()) return DEMO_ADMIN_ID;
  const { data } = await cliente().auth.getUser();
  return data.user?.id ?? null;
}

/** Ids de los usuarios bloqueados, para marcar «bloqueado» en otras pantallas. */
export async function listarIdsBloqueados(): Promise<Set<string>> {
  if (enDemo()) return new Set(demo().bloqueos.map((b) => b.user_id));
  const { data, error } = await cliente().from("bloqueos").select("user_id");
  if (error) throw error;
  return new Set((data ?? []).map((fila: { user_id: string }) => fila.user_id));
}

/** Bloquea con un motivo de 1 a 140 caracteres. creado_por es el admin de la sesión (la base no lo pone). */
export async function bloquear(userId: string, motivo: string): Promise<void> {
  if (enDemo()) {
    await esperaDemo();
    const d = demo();
    if (d.bloqueos.some((b) => b.user_id === userId)) throw new Error("YA_BLOQUEADO");
    const nombre =
      d.reportesPersonas.find((r) => r.usuario_id === userId)?.nombre ??
      d.publicaciones.find((p) => p.autor === userId)?.autor_nombre ??
      d.comentarios.find((c) => c.autor === userId)?.autor_nombre ??
      "Vecino";
    d.bloqueos = [
      { user_id: userId, nombre, motivo: motivo.trim(), creado_por: DEMO_ADMIN_ID, creado_en: new Date().toISOString() },
      ...d.bloqueos,
    ];
    // Al bloquear, los reportes de esa persona ya están resueltos.
    d.reportesPersonas = d.reportesPersonas.filter((r) => r.usuario_id !== userId);
    return;
  }
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
