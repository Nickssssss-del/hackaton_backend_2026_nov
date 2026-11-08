/**
 * Modelo. Emergencias cerradas de los últimos 7 días y quiénes fueron.
 * Solo lectura (es_admin() en emergencias_leer y vqv_leer).
 * No pide nombre, dirección ni coordenadas: de cada vecino solo el id.
 */
import { cliente } from "./supabase";

export interface VecinoCerrado {
  vecino_id: string;
  estado: string;
  vio_datos_en: string | null;
  reportado: boolean;
}

export interface EmergenciaCerrada {
  id: string;
  creado_en: string;
  cerrada_en: string;
  practica: boolean;
  fueron: number;
  vieronDatos: VecinoCerrado[];
  reportados: VecinoCerrado[];
}

type Fila = Omit<EmergenciaCerrada, "fueron" | "vieronDatos" | "reportados"> & {
  vecinos_que_van: VecinoCerrado[] | null;
};

const DIAS = 7;

export async function listarEmergenciasCerradas(): Promise<EmergenciaCerrada[]> {
  const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await cliente()
    .from("emergencias")
    .select("id, creado_en, cerrada_en, practica, vecinos_que_van(vecino_id, estado, vio_datos_en, reportado)")
    .eq("estado", "cerrada")
    .gte("cerrada_en", desde)
    .order("cerrada_en", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as Fila[]).map(({ vecinos_que_van, ...emergencia }) => {
    const vecinos = vecinos_que_van ?? [];
    return {
      ...emergencia,
      fueron: vecinos.filter((v) => v.estado === "va").length,
      vieronDatos: vecinos.filter((v) => v.vio_datos_en !== null),
      reportados: vecinos.filter((v) => v.reportado),
    };
  });
}
