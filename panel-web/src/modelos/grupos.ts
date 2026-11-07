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
  zona: string | null;
  verificada: boolean;
}

type FilaGrupo = Omit<GrupoApoyo, "zona"> & { zonas: { nombre: string } | null };

export async function listarGrupos(): Promise<GrupoApoyo[]> {
  const { data, error } = await cliente()
    .from("grupos_apoyo")
    .select("id, nombre, tipo, contacto, direccion, verificada, zonas(nombre)")
    .order("verificada")
    .order("nombre");
  if (error) throw error;
  return ((data ?? []) as unknown as FilaGrupo[]).map(({ zonas, ...grupo }) => ({
    ...grupo,
    zona: zonas?.nombre ?? null,
  }));
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
