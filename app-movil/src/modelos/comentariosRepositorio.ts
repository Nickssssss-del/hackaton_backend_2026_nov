/**
 * Modelo. Comentarios de negocios (E3) y de publicaciones de Comunidad (F2), desde el script 07.
 * Se leen por la vista comentarios_visibles (solo de mi zona y no ocultos) y se escriben en la
 * tabla comentarios. La base pone autor y fecha, rechaza enlaces (CON_ENLACE) y limita a 10 por día.
 */
import { obtenerSupabase } from "./supabase";

export interface ComentarioVisible {
  id: string;
  publicacionId?: string;
  servicioId?: string;
  autorCorto: string;
  texto: string;
  creadoEn: string;
  esMio: boolean;
}

export type Destino = { servicioId: string } | { publicacionId: string };

export async function listarComentarios(destino: Destino): Promise<ComentarioVisible[]> {
  let consulta = obtenerSupabase()
    .from("comentarios_visibles")
    .select("id, publicacion_id, servicio_id, autor_corto, texto, creado_en, es_mio")
    .order("creado_en", { ascending: false })
    .limit(30);
  consulta = "servicioId" in destino
    ? consulta.eq("servicio_id", destino.servicioId)
    : consulta.eq("publicacion_id", destino.publicacionId);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []).map((f: Record<string, unknown>) => ({
    id: String(f.id ?? ""),
    publicacionId: typeof f.publicacion_id === "string" ? f.publicacion_id : undefined,
    servicioId: typeof f.servicio_id === "string" ? f.servicio_id : undefined,
    autorCorto: typeof f.autor_corto === "string" ? f.autor_corto : "Un vecino",
    texto: typeof f.texto === "string" ? f.texto : "",
    creadoEn: typeof f.creado_en === "string" ? f.creado_en : "",
    esMio: Boolean(f.es_mio),
  }));
}

export async function comentar(destino: Destino, texto: string): Promise<void> {
  const fila: Record<string, string> = "servicioId" in destino
    ? { servicio_id: destino.servicioId, texto }
    : { publicacion_id: destino.publicacionId, texto };
  const { error } = await obtenerSupabase().from("comentarios").insert(fila);
  if (error) throw error;
}

export async function borrarComentario(id: string): Promise<void> {
  const { error } = await obtenerSupabase().from("comentarios").delete().eq("id", id);
  if (error) throw error;
}
