/**
 * Modelo. Tiempo de uso de los últimos 7 días (uso_app, solo es_admin()).
 * uso_app no guarda quién: solo zona, fecha, hora de Lima y segundos.
 */
import { cliente } from "./supabase";

export interface FilaUso {
  zona_id: string | null;
  fecha: string;
  hora: number;
  segundos: number;
}

export interface UsoPorZona {
  nombre: string;
  aperturas: number;
  minutos: number;
}

export interface ResumenUso {
  aperturas: number;
  minutosTotales: number;
  minutosPorApertura: number;
  /** "YYYY-MM-DD" con más aperturas, o null si no hay datos. */
  diaPico: string | null;
  /** 0 a 23, o null si no hay datos. */
  horaPico: number | null;
  zonas: UsoPorZona[];
}

const LOTE = 1000;
/** Menos aperturas que esto no se muestran por zona: se suman en «Otras zonas». */
export const MINIMO_POR_ZONA = 5;

/** Lee las filas de 7 días por lotes (PostgREST corta en 1000) y los nombres de las zonas. */
export async function leerUsoSemana(): Promise<{ filas: FilaUso[]; zonas: Map<string, string> }> {
  const sb = cliente();
  const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const filas: FilaUso[] = [];
  // shortcut: suma en el navegador; si pasa de unas decenas de miles de filas, mover a una vista o función.
  for (let inicio = 0; ; inicio += LOTE) {
    const { data, error } = await sb
      .from("uso_app")
      .select("zona_id, fecha, hora, segundos")
      .gte("creado_en", desde)
      .order("id")
      .range(inicio, inicio + LOTE - 1);
    if (error) throw error;
    filas.push(...((data ?? []) as FilaUso[]));
    if (!data || data.length < LOTE) break;
  }

  const { data: zonas, error } = await sb.from("zonas").select("id, nombre");
  if (error) throw error;
  return { filas, zonas: new Map((zonas ?? []).map((z: { id: string; nombre: string }) => [z.id, z.nombre])) };
}

function masFrecuente<T>(valores: T[]): T | null {
  const cuenta = new Map<T, number>();
  for (const v of valores) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  let mejor: T | null = null;
  let maximo = 0;
  for (const [v, n] of cuenta) {
    if (n > maximo) {
      mejor = v;
      maximo = n;
    }
  }
  return mejor;
}

const aMinutos = (segundos: number) => Math.round(segundos / 60);

/** Resume las filas. Por zona solo las de 5 o más aperturas; el resto, en «Otras zonas». */
export function resumirUso(filas: FilaUso[], nombres: Map<string, string>): ResumenUso {
  const totalSegundos = filas.reduce((suma, f) => suma + f.segundos, 0);

  const porZona = new Map<string, { aperturas: number; segundos: number }>();
  for (const f of filas) {
    const nombre = f.zona_id === null ? "Sin zona" : nombres.get(f.zona_id) ?? "Zona sin nombre";
    const actual = porZona.get(nombre) ?? { aperturas: 0, segundos: 0 };
    porZona.set(nombre, { aperturas: actual.aperturas + 1, segundos: actual.segundos + f.segundos });
  }

  const zonas: UsoPorZona[] = [];
  const otras = { aperturas: 0, segundos: 0 };
  for (const [nombre, z] of porZona) {
    if (z.aperturas >= MINIMO_POR_ZONA) zonas.push({ nombre, aperturas: z.aperturas, minutos: aMinutos(z.segundos) });
    else {
      otras.aperturas += z.aperturas;
      otras.segundos += z.segundos;
    }
  }
  zonas.sort((a, b) => b.aperturas - a.aperturas);
  if (otras.aperturas > 0) zonas.push({ nombre: "Otras zonas", aperturas: otras.aperturas, minutos: aMinutos(otras.segundos) });

  return {
    aperturas: filas.length,
    minutosTotales: aMinutos(totalSegundos),
    minutosPorApertura: filas.length === 0 ? 0 : Math.round((totalSegundos / filas.length / 60) * 10) / 10,
    diaPico: masFrecuente(filas.map((f) => f.fecha)),
    horaPico: masFrecuente(filas.map((f) => f.hora)),
    zonas,
  };
}
