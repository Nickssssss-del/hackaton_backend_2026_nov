/**
 * Modelo. Publicaciones y comentarios ocultos con sus reportes. Solo con es_admin():
 * publicaciones_*, comentarios_*, reportes_com_leer_admin y fotos_ver_mi_zona.
 */
import { cliente, exigirFilas } from "./supabase";

export type TablaComunidad = "publicaciones" | "comentarios";

export interface ReporteComunidad {
  id: string;
  motivo: string;
  creado_en: string;
}

interface ContenidoOculto {
  id: string;
  autor: string;
  creado_en: string;
  revisado_en: string | null;
  reportes: ReporteComunidad[];
}

export interface PublicacionOculta extends ContenidoOculto {
  categoria: string;
  mensaje: string | null;
  /** Dirección del evento (script 10), o null. */
  lugar: string | null;
  zona: string | null;
  /** URL firmada por 5 minutos, o null si no tiene foto o no se pudo firmar. */
  foto_url: string | null;
  tiene_foto: boolean;
}

export interface ComentarioOculto extends ContenidoOculto {
  texto: string;
  en_publicacion: boolean;
}

const ordenarReportes = (reportes: ReporteComunidad[] | null) =>
  [...(reportes ?? [])].sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en));

export async function listarPublicacionesOcultas(): Promise<PublicacionOculta[]> {
  const sb = cliente();
  const { data, error } = await sb
    .from("publicaciones")
    .select(
      "id, autor, categoria, mensaje, lugar, foto_path, creado_en, revisado_en, zonas(nombre), reportes_comunidad(id, motivo, creado_en)",
    )
    .eq("oculto", true)
    .order("creado_en", { ascending: false });
  if (error) throw error;

  type Fila = {
    id: string; autor: string; categoria: string; mensaje: string | null; lugar: string | null; foto_path: string | null;
    creado_en: string; revisado_en: string | null; zonas: { nombre: string } | null;
    reportes_comunidad: ReporteComunidad[] | null;
  };
  const filas = (data ?? []) as unknown as Fila[];

  // Una publicación puede ser solo foto: para moderarla hay que verla.
  const rutas = filas.map((f) => f.foto_path).filter((r): r is string => !!r);
  const urls = new Map<string, string>();
  if (rutas.length > 0) {
    const { data: firmadas } = await sb.storage.from("fotos").createSignedUrls(rutas, 300);
    for (const f of firmadas ?? []) if (f.path && f.signedUrl) urls.set(f.path, f.signedUrl);
  }

  return filas.map((f) => ({
    id: f.id,
    autor: f.autor,
    categoria: f.categoria,
    mensaje: f.mensaje,
    lugar: f.lugar,
    creado_en: f.creado_en,
    revisado_en: f.revisado_en,
    zona: f.zonas?.nombre ?? null,
    tiene_foto: !!f.foto_path,
    foto_url: f.foto_path ? urls.get(f.foto_path) ?? null : null,
    reportes: ordenarReportes(f.reportes_comunidad),
  }));
}

export async function listarComentariosOcultos(): Promise<ComentarioOculto[]> {
  const { data, error } = await cliente()
    .from("comentarios")
    .select("id, autor, texto, publicacion_id, creado_en, revisado_en, reportes_comunidad(id, motivo, creado_en)")
    .eq("oculto", true)
    .order("creado_en", { ascending: false });
  if (error) throw error;

  type Fila = {
    id: string; autor: string; texto: string; publicacion_id: string | null;
    creado_en: string; revisado_en: string | null; reportes_comunidad: ReporteComunidad[] | null;
  };
  return ((data ?? []) as unknown as Fila[]).map((f) => ({
    id: f.id,
    autor: f.autor,
    texto: f.texto,
    en_publicacion: f.publicacion_id !== null,
    creado_en: f.creado_en,
    revisado_en: f.revisado_en,
    reportes: ordenarReportes(f.reportes_comunidad),
  }));
}

/** Vuelve a mostrar. La base pone revisado_en sola y los reportes viejos dejan de contar. */
export async function volverAMostrar(tabla: TablaComunidad, id: string): Promise<void> {
  const { data, error } = await cliente().from(tabla).update({ oculto: false }).eq("id", id).select("id");
  if (error) throw error;
  exigirFilas(data);
}

/**
 * Borra la publicación o el comentario. Sus reportes se borran en cascada.
 * Si la publicación tenía foto, la borra del bucket fotos (política fotos_borrar con es_admin()).
 * fotoSinBorrar: la fila se borró, pero la foto no se pudo borrar.
 */
export async function borrarContenido(tabla: TablaComunidad, id: string): Promise<{ fotoSinBorrar: boolean }> {
  const sb = cliente();
  const columnas = tabla === "publicaciones" ? "id, foto_path" : "id";
  const { data, error } = await sb.from(tabla).delete().eq("id", id).select(columnas);
  if (error) throw error;
  exigirFilas(data);
  const ruta = (data[0] as { foto_path?: string | null }).foto_path;
  if (!ruta) return { fotoSinBorrar: false };
  // Con RLS, un borrado sin permiso no da error: devuelve una lista vacía.
  const { data: borradas, error: errorFoto } = await sb.storage.from("fotos").remove([ruta]);
  return { fotoSinBorrar: !!errorFoto || !borradas || borradas.length === 0 };
}
