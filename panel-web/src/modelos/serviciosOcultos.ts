/**
 * Modelo. Servicios ocultos y sus reportes. Solo con es_admin():
 * servicios_leer, servicios_editar, servicios_borrar y reportes_leer_admin.
 * No lee perfiles: el admin no tiene política sobre perfiles ajenos.
 */
import { cliente, exigirFilas } from "./supabase";

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

export async function listarServiciosOcultos(): Promise<ServicioOculto[]> {
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
    reportes: [...(reportes ?? [])].sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en)),
  }));
}

/**
 * Vuelve a mostrar el servicio. revisado_en = ahora reinicia el conteo:
 * ocultar_por_reportes solo cuenta reportes posteriores a la revisión.
 */
export async function volverAMostrar(id: string): Promise<void> {
  const { data, error } = await cliente()
    .from("servicios")
    .update({ oculto: false, revisado_en: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  exigirFilas(data);
}

/**
 * Borra el servicio. Sus reportes y vistos buenos se borran en cascada.
 * Si tenía foto, la borra del bucket fotos (política fotos_borrar con es_admin()).
 * fotoSinBorrar: la fila se borró, pero la foto no se pudo borrar.
 */
export async function borrarServicio(id: string): Promise<{ fotoSinBorrar: boolean }> {
  const sb = cliente();
  const { data, error } = await sb.from("servicios").delete().eq("id", id).select("id, foto_path");
  if (error) throw error;
  exigirFilas(data);
  const ruta = (data[0] as { foto_path: string | null }).foto_path;
  if (!ruta) return { fotoSinBorrar: false };
  // Con RLS, un borrado sin permiso no da error: devuelve una lista vacía.
  const { data: borradas, error: errorFoto } = await sb.storage.from("fotos").remove([ruta]);
  return { fotoSinBorrar: !!errorFoto || !borradas || borradas.length === 0 };
}
