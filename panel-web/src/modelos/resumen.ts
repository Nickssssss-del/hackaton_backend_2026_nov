/**
 * Modelo. Totales del resumen. Solo conteos (head), sin filas de personas.
 * El admin puede leer estas tablas: servicios_leer, pedidos_leer,
 * emergencias_leer, reportes_leer_admin y reportes_com_leer_admin.
 */
import { cliente } from "./supabase";

export interface ResumenDia {
  negociosVisibles: number;
  pedidosAbiertos: number;
  emergenciasReales: number;
  reportesPendientes: number;
  avisosInicio: number;
  avisosCierre: number;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Medianoche a medianoche en America/Lima (UTC−5, sin horario de verano). */
export function limitesDiaLima(ahora = new Date()): { desde: string; hasta: string } {
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
  const desde = new Date(`${fecha}T00:00:00-05:00`);
  return { desde: desde.toISOString(), hasta: new Date(desde.getTime() + DIA_MS).toISOString() };
}

async function contar(consulta: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<number> {
  const { count, error } = await consulta;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Igual que Servicios ocultos y Comunidad oculta: un reporte deja de contar
 * si su fecha es anterior o igual a revisado_en («antes de la última revisión»).
 */
function sigueContando(creadoEn: string, revisadoEn: string | null): boolean {
  return revisadoEn === null || Date.parse(creadoEn) > Date.parse(revisadoEn);
}

type FilaReporte = {
  creado_en: string;
  servicios?: { revisado_en: string | null } | { revisado_en: string | null }[] | null;
  publicaciones?: { revisado_en: string | null } | { revisado_en: string | null }[] | null;
  comentarios?: { revisado_en: string | null } | { revisado_en: string | null }[] | null;
};

function revisadoDe(fila: FilaReporte, destino: "servicios" | "publicaciones" | "comentarios"): string | null {
  const padre = fila[destino];
  const uno = Array.isArray(padre) ? padre[0] : padre;
  return uno?.revisado_en ?? null;
}

/** Solo creado_en y revisado_en: PostgREST no compara esas dos columnas en un conteo. */
async function contarReportesQueSiguen(
  tabla: "reportes" | "reportes_comunidad",
  destino: "servicios" | "publicaciones" | "comentarios",
  columna: "servicio_id" | "publicacion_id" | "comentario_id",
): Promise<number> {
  const pagina = 1000;
  let desde = 0;
  let total = 0;
  for (;;) {
    const { data, error } = await cliente()
      .from(tabla)
      .select(`creado_en, ${destino}(revisado_en)`)
      .not(columna, "is", null)
      .order("creado_en", { ascending: true })
      .range(desde, desde + pagina - 1);
    if (error) throw error;
    const filas = (data ?? []) as unknown as FilaReporte[];
    total += filas.filter((fila) => sigueContando(fila.creado_en, revisadoDe(fila, destino))).length;
    if (filas.length < pagina) break;
    desde += pagina;
  }
  return total;
}

export async function leerResumen(): Promise<ResumenDia> {
  const { desde, hasta } = limitesDiaLima();
  const sb = cliente();

  const [negociosVisibles, pedidosAbiertos, emergenciasReales, avisosInicio, avisosCierre, deServicios, dePublicaciones, deComentarios, dePersonas] =
    await Promise.all([
      contar(
        sb.from("servicios").select("id", { count: "exact", head: true }).eq("oculto", false).eq("visible_vecinos", true),
      ),
      contar(
        sb
          .from("pedidos_ayuda")
          .select("id", { count: "exact", head: true })
          .eq("estado", "abierto")
          .gt("expira_en", new Date().toISOString()),
      ),
      contar(
        sb
          .from("emergencias")
          .select("id", { count: "exact", head: true })
          .eq("practica", false)
          .gte("creado_en", desde)
          .lt("creado_en", hasta),
      ),
      contar(
        sb.from("emergencias").select("id", { count: "exact", head: true }).gte("avisado_en", desde).lt("avisado_en", hasta),
      ),
      contar(
        sb
          .from("emergencias")
          .select("id", { count: "exact", head: true })
          .gte("cierre_avisado_en", desde)
          .lt("cierre_avisado_en", hasta),
      ),
      contarReportesQueSiguen("reportes", "servicios", "servicio_id"),
      contarReportesQueSiguen("reportes_comunidad", "publicaciones", "publicacion_id"),
      contarReportesQueSiguen("reportes_comunidad", "comentarios", "comentario_id"),
      contar(sb.from("reportes_comunidad").select("id", { count: "exact", head: true }).not("usuario_id", "is", null)),
    ]);

  return {
    negociosVisibles,
    pedidosAbiertos,
    emergenciasReales,
    reportesPendientes: deServicios + dePublicaciones + deComentarios + dePersonas,
    avisosInicio,
    avisosCierre,
  };
}
