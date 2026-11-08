/**
 * Modelo. Emergencias activas con su cadena y los vecinos que van. Solo lectura (es_admin()).
 * No pide nombre, dirección ni coordenadas: el panel solo da seguimiento.
 */
import { cliente } from "./supabase";

export interface Eslabon {
  orden: number;
  contacto: string | null;
  estado: string;
}

export interface EmergenciaActiva {
  id: string;
  creado_en: string;
  expira_en: string;
  practica: boolean;
  avisar_vecinos: boolean;
  eslabones: Eslabon[];
  vecinos_van: number;
}

type FilaEmergencia = Omit<EmergenciaActiva, "vecinos_van"> & { vecinos_que_van: { estado: string }[] | null };

export async function listarEmergenciasActivas(): Promise<EmergenciaActiva[]> {
  const { data, error } = await cliente()
    .from("emergencias")
    .select("id, creado_en, expira_en, practica, avisar_vecinos, eslabones(orden, contacto, estado), vecinos_que_van(estado)")
    .eq("estado", "activa")
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as FilaEmergencia[]).map(({ vecinos_que_van, eslabones, ...emergencia }) => ({
    ...emergencia,
    eslabones: [...(eslabones ?? [])].sort((a, b) => a.orden - b.orden),
    vecinos_van: (vecinos_que_van ?? []).filter((v) => v.estado === "va").length,
  }));
}

/**
 * Avisa ante cualquier cambio en emergencias, eslabones o vecinos_que_van (Realtime respeta la RLS).
 * No usa el contenido del evento: quien escucha vuelve a leer la lista. Devuelve cómo dejar de escuchar.
 */
export function escucharEmergencias(alCambiar: () => void, alCambiarConexion: (enVivo: boolean) => void): () => void {
  const sb = cliente();
  const canal = sb.channel("panel-emergencias");
  for (const tabla of ["emergencias", "eslabones", "vecinos_que_van"]) {
    canal.on("postgres_changes", { event: "*", schema: "public", table: tabla }, alCambiar);
  }
  canal.subscribe((estado) => alCambiarConexion(estado === "SUBSCRIBED"));
  return () => {
    void sb.removeChannel(canal);
  };
}
