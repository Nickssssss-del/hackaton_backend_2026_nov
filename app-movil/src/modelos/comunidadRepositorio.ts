/**
 * Modelo. Comunidad (F2, F3), desde el script 07.
 * - Lee la vista publicaciones_cercanas (solo de mi zona y no ocultas).
 * - Publicar inserta en publicaciones: la base pone autor, zona y fecha, rechaza enlaces
 *   (CON_ENLACE) y permite 3 por día (LIMITE_DIARIO).
 * - «Voy» inserta o borra mi fila en asistencias.
 * - Reportar inserta en reportes_comunidad (3 vecinos distintos ocultan la publicación).
 */
import {
  CATEGORIAS_PUBLICACION,
  type CategoriaPublicacion,
  type DestinoReporte,
  type MotivoReporteComunidad,
  type Publicacion,
} from "./comunidad";
import { obtenerSupabase } from "./supabase";

export async function listarPublicaciones(): Promise<Publicacion[]> {
  const { data, error } = await obtenerSupabase()
    .from("publicaciones_cercanas")
    .select("id, autor_corto, categoria, mensaje, foto_path, creado_en, minutos_antiguedad, asistentes, voy, comentarios, es_mio")
    .order("creado_en", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((f: Record<string, unknown>) => {
    const minutos = Number(f.minutos_antiguedad) || 0;
    return {
      id: String(f.id ?? ""),
      autorCorto: typeof f.autor_corto === "string" && f.autor_corto ? f.autor_corto : "Un vecino",
      categoria: categoria(f.categoria),
      mensaje: typeof f.mensaje === "string" ? f.mensaje : "",
      fotoPath: typeof f.foto_path === "string" && f.foto_path ? f.foto_path : undefined,
      creadoEn: typeof f.creado_en === "string" ? f.creado_en : "",
      antiguedad: antiguedad(minutos),
      asistentes: Number(f.asistentes) || 0,
      voy: Boolean(f.voy),
      comentarios: Number(f.comentarios) || 0,
      esMia: Boolean(f.es_mio),
    };
  });
}

export async function publicar(categoria: CategoriaPublicacion, mensaje: string, fotoPath?: string): Promise<void> {
  const { error } = await obtenerSupabase()
    .from("publicaciones")
    .insert({ categoria, mensaje, ...(fotoPath ? { foto_path: fotoPath } : {}) });
  if (error) throw error;
}

export async function borrarPublicacion(id: string): Promise<void> {
  const { error } = await obtenerSupabase().from("publicaciones").delete().eq("id", id);
  if (error) throw error;
}

export async function marcarVoy(publicacionId: string, voy: boolean): Promise<void> {
  const supabase = obtenerSupabase();
  if (voy) {
    const { error } = await supabase.from("asistencias").insert({ publicacion_id: publicacionId });
    // 23505: ya estaba marcada; no es un error para la persona.
    if (error && error.code !== "23505") throw error;
    return;
  }
  const { data } = await supabase.auth.getUser();
  const yo = data.user?.id;
  if (!yo) throw new Error("SIN_SESION");
  const { error } = await supabase.from("asistencias").delete().eq("publicacion_id", publicacionId).eq("vecino_id", yo);
  if (error) throw error;
}

export async function reportarComunidad(destino: DestinoReporte, motivo: MotivoReporteComunidad): Promise<void> {
  const fila: Record<string, string> = "publicacionId" in destino
    ? { publicacion_id: destino.publicacionId, motivo }
    : { comentario_id: destino.comentarioId, motivo };
  const { error } = await obtenerSupabase().from("reportes_comunidad").insert(fila);
  if (error) throw error;
}

function categoria(v: unknown): CategoriaPublicacion {
  return CATEGORIAS_PUBLICACION.includes(v as CategoriaPublicacion) ? (v as CategoriaPublicacion) : "otro";
}

function antiguedad(minutos: number): string {
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}
