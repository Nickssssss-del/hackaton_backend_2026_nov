/**
 * Modelo. Grupos de apoyo. Lectura pública; marcar como verificada solo con es_admin()
 * (política grupos_admin).
 */
import { cliente, exigirFilas } from "./supabase";

export interface GrupoApoyo {
  id: string;
  nombre: string;
  tipo: string;
  contacto: string | null;
  direccion: string | null;
  zona_id: string | null;
  zona: string | null;
  verificada: boolean;
}

export interface ZonaOpcion {
  id: string;
  nombre: string;
}

export interface DatosGrupo {
  nombre: string;
  tipo: string;
  zona_id: string | null;
  contacto: string | null;
  direccion: string | null;
}

type FilaGrupo = Omit<GrupoApoyo, "zona"> & { zonas: { nombre: string } | null };

export async function listarGrupos(): Promise<GrupoApoyo[]> {
  const { data, error } = await cliente()
    .from("grupos_apoyo")
    .select("id, nombre, tipo, contacto, direccion, zona_id, verificada, zonas(nombre)")
    .order("verificada")
    .order("nombre");
  if (error) throw error;
  return ((data ?? []) as unknown as FilaGrupo[]).map(({ zonas, ...grupo }) => ({
    ...grupo,
    zona: zonas?.nombre ?? null,
  }));
}

export async function listarZonas(): Promise<ZonaOpcion[]> {
  const { data, error } = await cliente().from("zonas").select("id, nombre").order("nombre");
  if (error) throw error;
  return (data ?? []) as ZonaOpcion[];
}

function sinPermiso(error: { code?: string; message?: string } | null): void {
  const detalle = `${error?.code ?? ""} ${error?.message ?? ""}`;
  if (detalle.includes("42501") || /row-level security|permission denied/i.test(detalle)) {
    throw new Error("SIN_PERMISO");
  }
}

/** Un grupo nuevo queda sin verificar. La marca se pone con marcarVerificada. */
export async function crearGrupo(datos: DatosGrupo): Promise<void> {
  const { data, error } = await cliente()
    .from("grupos_apoyo")
    .insert({ ...datos, verificada: false, verificada_por: null })
    .select("id");
  sinPermiso(error);
  if (error) throw error;
  exigirFilas(data);
}

/** No cambia verificada ni verificada_por. */
export async function editarGrupo(id: string, datos: DatosGrupo): Promise<void> {
  const { data, error } = await cliente().from("grupos_apoyo").update(datos).eq("id", id).select("id");
  sinPermiso(error);
  if (error) throw error;
  exigirFilas(data);
}

export async function borrarGrupo(id: string): Promise<void> {
  const { data, error } = await cliente().from("grupos_apoyo").delete().eq("id", id).select("id");
  sinPermiso(error);
  if (error) throw error;
  exigirFilas(data);
}

export async function marcarVerificada(id: string): Promise<void> {
  const sb = cliente();
  const { data: usuario, error: errorUsuario } = await sb.auth.getUser();
  if (errorUsuario) throw errorUsuario;
  const { data, error } = await sb
    .from("grupos_apoyo")
    .update({ verificada: true, verificada_por: usuario.user.id })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  exigirFilas(data);
}
