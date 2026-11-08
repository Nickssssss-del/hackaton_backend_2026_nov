/**
 * Modelo. Publicaciones y comentarios ocultos con sus reportes. Solo con es_admin():
 * publicaciones_*, comentarios_*, reportes_com_leer_admin y fotos_ver_mi_zona.
 */
import { demo } from "./demo";
import { cliente, enDemo, esperaDemo, exigirFilas } from "./supabase";

export type TablaComunidad = "publicaciones" | "comentarios";

export interface ReporteComunidad {
  id: string;
  motivo: string;
  creado_en: string;
}

interface ContenidoOculto {
  id: string;
  autor: string;
  /** Solo en demo: el admin no puede leer perfiles ajenos. */
  autor_nombre?: string | null;
  zona: string | null;
  creado_en: string;
  revisado_en: string | null;
  reportes: ReporteComunidad[];
}

export interface PublicacionOculta extends ContenidoOculto {
  categoria: string;
  mensaje: string | null;
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
  if (enDemo()) {
    await esperaDemo();
    return demo().publicaciones.map((p) => ({ ...p, reportes: ordenarReportes(p.reportes) }));
  }
  const sb = cliente();
  const { data, error } = await sb
    .from("publicaciones")
    .select("id, autor, categoria, mensaje, foto_path, creado_en, revisado_en, zonas(nombre), reportes_comunidad(id, motivo, creado_en)")
    .eq("oculto", true)
    .order("creado_en", { ascending: false });
  if (error) throw error;

  type Fila = {
    id: string; autor: string; categoria: string; mensaje: string | null; foto_path: string | null;
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
    creado_en: f.creado_en,
    revisado_en: f.revisado_en,
    zona: f.zonas?.nombre ?? null,
    tiene_foto: !!f.foto_path,
    foto_url: f.foto_path ? urls.get(f.foto_path) ?? null : null,
    reportes: ordenarReportes(f.reportes_comunidad),
  }));
}

export async function listarComentariosOcultos(): Promise<ComentarioOculto[]> {
  if (enDemo()) {
    await esperaDemo();
    return demo().comentarios.map((c) => ({ ...c, reportes: ordenarReportes(c.reportes) }));
  }
  const { data, error } = await cliente()
    .from("comentarios")
    .select(
      "id, autor, texto, publicacion_id, creado_en, revisado_en, reportes_comunidad(id, motivo, creado_en), publicaciones(zonas(nombre)), servicios(zonas(nombre))",
    )
    .eq("oculto", true)
    .order("creado_en", { ascending: false });
  if (error) throw error;

  type ConZona = { zonas: { nombre: string } | null } | null;
  type Fila = {
    id: string; autor: string; texto: string; publicacion_id: string | null;
    creado_en: string; revisado_en: string | null; reportes_comunidad: ReporteComunidad[] | null;
    publicaciones: ConZona; servicios: ConZona;
  };
  return ((data ?? []) as unknown as Fila[]).map((f) => ({
    id: f.id,
    autor: f.autor,
    texto: f.texto,
    en_publicacion: f.publicacion_id !== null,
    zona: f.publicaciones?.zonas?.nombre ?? f.servicios?.zonas?.nombre ?? null,
    creado_en: f.creado_en,
    revisado_en: f.revisado_en,
    reportes: ordenarReportes(f.reportes_comunidad),
  }));
}

/** Vuelve a mostrar. La base pone revisado_en sola y los reportes viejos dejan de contar. */
export async function volverAMostrar(tabla: TablaComunidad, id: string): Promise<void> {
  if (enDemo()) return quitarDemo(tabla, id);
  const { data, error } = await cliente().from(tabla).update({ oculto: false }).eq("id", id).select("id");
  if (error) throw error;
  exigirFilas(data);
}

/** Borra la publicación o el comentario. Sus reportes se borran en cascada. */
export async function borrarContenido(tabla: TablaComunidad, id: string): Promise<void> {
  if (enDemo()) return quitarDemo(tabla, id);
  const { data, error } = await cliente().from(tabla).delete().eq("id", id).select("id");
  if (error) throw error;
  exigirFilas(data);
}

async function quitarDemo(tabla: TablaComunidad, id: string): Promise<void> {
  await esperaDemo();
  const d = demo();
  if (tabla === "publicaciones") d.publicaciones = d.publicaciones.filter((p) => p.id !== id);
  else d.comentarios = d.comentarios.filter((c) => c.id !== id);
}
