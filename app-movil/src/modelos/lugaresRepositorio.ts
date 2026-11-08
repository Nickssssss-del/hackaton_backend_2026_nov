/**
 * Modelo (repositorio). Trae los lugares de ayuda desde OpenStreetMap (Overpass API) y guarda una
 * copia en el teléfono para usarla sin internet. Nunca pasa por Supabase.
 * - Con internet: consulta un círculo de 2 km y guarda la copia con la posición y la fecha.
 * - Sin internet o si falla: usa la última copia, aunque sea de otra posición cercana.
 */
import { guardarJson, leerJson } from "./almacen";
import { distanciaMetros } from "./geo";
import { consultaOverpass, leerRespuestaOverpass, RADIO_MAXIMO_M, type LugarAyuda } from "./lugaresAyuda";

const CLAVE = "lugares_ayuda";
const SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const TIEMPO_MAXIMO = 15000;
/** Si la persona se movió menos de esto y la copia tiene menos de 7 días, no se vuelve a pedir. */
const MOVIMIENTO_MAXIMO_M = 500;
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

export interface CopiaLugares {
  lat: number;
  lng: number;
  fecha: string;
  lugares: LugarAyuda[];
}

export function leerCopiaLugares(): Promise<CopiaLugares | null> {
  return leerJson<CopiaLugares | null>(CLAVE, null);
}

async function pedir(url: string, consulta: string): Promise<LugarAyuda[]> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_MAXIMO);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(consulta)}`,
      signal: control.signal,
    });
    if (!r.ok) throw new Error(`Overpass ${r.status}`);
    return leerRespuestaOverpass(await r.json());
  } finally {
    clearTimeout(reloj);
  }
}

export type OrigenLugares = "internet" | "copia" | "ninguno";

export async function obtenerLugares(lat: number, lng: number, forzar = false): Promise<{ copia: CopiaLugares | null; origen: OrigenLugares }> {
  const copia = await leerCopiaLugares();
  const reciente =
    copia &&
    distanciaMetros(lat, lng, copia.lat, copia.lng) < MOVIMIENTO_MAXIMO_M &&
    Date.now() - new Date(copia.fecha).getTime() < VIGENCIA_MS;
  if (reciente && !forzar) return { copia, origen: "copia" };

  const consulta = consultaOverpass(lat, lng, RADIO_MAXIMO_M);
  for (const url of SERVIDORES) {
    try {
      const lugares = await pedir(url, consulta);
      const nueva: CopiaLugares = { lat, lng, fecha: new Date().toISOString(), lugares };
      await guardarJson(CLAVE, nueva);
      return { copia: nueva, origen: "internet" };
    } catch {
      // probar el siguiente servidor
    }
  }
  return { copia, origen: copia ? "copia" : "ninguno" };
}
