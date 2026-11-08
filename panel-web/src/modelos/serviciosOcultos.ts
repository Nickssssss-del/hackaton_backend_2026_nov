/**
 * Modelo. Servicios ocultos y sus reportes. Solo con es_admin():
 * servicios_leer, servicios_editar, servicios_borrar y reportes_leer_admin.
 * No lee perfiles: el admin no tiene política sobre perfiles ajenos.
 */
import { demo, demoZonas } from "./demo";
import { cliente, enDemo, esperaDemo, exigirFilas } from "./supabase";

export interface ReporteServicio {
  id: string;
  motivo: string;
  creado_en: string;
}

export interface ServicioOculto {
  id: string;
  nombre_negocio: string | null;
  oficio: string;
  descripcion: string | null;
  zona: string | null;
  creado_en: string;
  revisado_en: string | null;
  reportes: ReporteServicio[];
}

type FilaServicio = Omit<ServicioOculto, "zona"> & { zonas: { nombre: string } | null };

const ordenar = (reportes: ReporteServicio[] | null) =>
  [...(reportes ?? [])].sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en));

export async function listarServiciosOcultos(): Promise<ServicioOculto[]> {
  if (enDemo()) {
    await esperaDemo();
    return demo().servicios.map((s) => ({ ...s, reportes: ordenar(s.reportes) }));
  }
  const { data, error } = await cliente()
    .from("servicios")
    .select(
      "id, nombre_negocio, oficio, descripcion, creado_en, revisado_en, zonas(nombre), reportes(id, motivo, creado_en)",
    )
    .eq("oculto", true)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as FilaServicio[]).map(({ zonas, reportes, ...servicio }) => ({
    ...servicio,
    zona: zonas?.nombre ?? null,
    reportes: ordenar(reportes),
  }));
}

/** Zona de cada negocio visible, para contar «Negocios visibles» por zona. */
export async function zonasDeServiciosVisibles(): Promise<(string | null)[]> {
  if (enDemo()) {
    // En demo los totales salen de DEMO_RESUMEN; esto no se usa.
    return demoZonas().map((z) => z.nombre);
  }
  const { data, error } = await cliente().from("servicios").select("zonas(nombre)").eq("oculto", false);
  if (error) throw error;
  return ((data ?? []) as unknown as { zonas: { nombre: string } | null }[]).map((f) => f.zonas?.nombre ?? null);
}

/**
 * Vuelve a mostrar el servicio. revisado_en = ahora reinicia el conteo:
 * ocultar_por_reportes solo cuenta reportes posteriores a la revisión.
 */
export async function volverAMostrar(id: string): Promise<void> {
  if (enDemo()) {
    await esperaDemo();
    demo().servicios = demo().servicios.filter((s) => s.id !== id);
    return;
  }
  const { data, error } = await cliente()
    .from("servicios")
    .update({ oculto: false, revisado_en: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  exigirFilas(data);
}

/** Borra el servicio. Sus reportes y vistos buenos se borran en cascada. */
export async function borrarServicio(id: string): Promise<void> {
  if (enDemo()) {
    await esperaDemo();
    demo().servicios = demo().servicios.filter((s) => s.id !== id);
    return;
  }
  const { data, error } = await cliente().from("servicios").delete().eq("id", id).select("id");
  if (error) throw error;
  exigirFilas(data);
}
