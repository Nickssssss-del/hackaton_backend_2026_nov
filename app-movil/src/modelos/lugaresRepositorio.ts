/**
 * Modelo (repositorio). Trae los lugares de ayuda desde OpenStreetMap (Overpass API) y guarda una
 * copia en el teléfono para usarla sin internet. Nunca pasa por Supabase.
 * - Con internet: consulta un círculo de 2 km y guarda la copia con la posición y la fecha.
 * - Sin internet o si falla: usa la última copia, aunque sea de otra posición cercana.
 *
 * Por qué antes no cargaba (nov. 2026):
 * - overpass-api.de rechaza con 406 las apps que no dicen quiénes son (User-Agent de okhttp):
 *   ahora se envía un User-Agent propio, como pide la política de OpenStreetMap.
 * - El servidor de respaldo (overpass.kumi.systems) ya no responde: se cambió por maps.mail.ru.
 * - Overpass tarda 18-35 s en responder y la app cortaba a los 15 s: ahora espera hasta 45 s y
 *   pregunta a los dos servidores a la vez (gana el primero que responda bien).
 * - Una copia vacía no cuenta como «reciente»: se vuelve a preguntar.
 */
import { guardarJson, leerJson } from "./almacen";
import { distanciaMetros } from "./geo";
import { consultaOverpass, leerRespuestaOverpass, RADIO_MAXIMO_M, type LugarAyuda } from "./lugaresAyuda";

const CLAVE = "lugares_ayuda";
const SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const USER_AGENT = "Kuna/1.0 (app comunitaria de vecinos, Hackaton UTP 2026)";
const TIEMPO_MAXIMO = 45000;
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

async function pedir(url: string, consulta: string, control: AbortController): Promise<LugarAyuda[]> {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    body: `data=${encodeURIComponent(consulta)}`,
    signal: control.signal,
  });
  if (!r.ok) throw new Error(`Overpass ${r.status}`);
  return leerRespuestaOverpass(await r.json());
}

/** Pregunta a todos los servidores a la vez; devuelve la primera respuesta buena y cancela las demás. */
function primeroQueResponda(consulta: string): Promise<LugarAyuda[]> {
  const controles = SERVIDORES.map(() => new AbortController());
  const reloj = setTimeout(() => controles.forEach((c) => c.abort()), TIEMPO_MAXIMO);
  return new Promise<LugarAyuda[]>((resolver, rechazar) => {
    let fallidos = 0;
    SERVIDORES.forEach((url, k) => {
      pedir(url, consulta, controles[k])
        .then((lugares) => {
          clearTimeout(reloj);
          controles.forEach((c, j) => j !== k && c.abort());
          resolver(lugares);
        })
        .catch((causa) => {
          fallidos += 1;
          if (fallidos === SERVIDORES.length) {
            clearTimeout(reloj);
            rechazar(causa);
          }
        });
    });
  });
}

export type OrigenLugares = "internet" | "copia" | "ninguno";

export async function obtenerLugares(lat: number, lng: number, forzar = false): Promise<{ copia: CopiaLugares | null; origen: OrigenLugares }> {
  const copia = await leerCopiaLugares();
  const reciente =
    copia &&
    copia.lugares.length > 0 &&
    distanciaMetros(lat, lng, copia.lat, copia.lng) < MOVIMIENTO_MAXIMO_M &&
    Date.now() - new Date(copia.fecha).getTime() < VIGENCIA_MS;
  if (reciente && !forzar) return { copia, origen: "copia" };

  try {
    const lugares = await primeroQueResponda(consultaOverpass(lat, lng, RADIO_MAXIMO_M));
    const nueva: CopiaLugares = { lat, lng, fecha: new Date().toISOString(), lugares };
    await guardarJson(CLAVE, nueva);
    return { copia: nueva, origen: "internet" };
  } catch {
    // Sin internet o sin respuesta: la última copia (si tiene lugares).
    const util = copia && copia.lugares.length > 0 ? copia : null;
    return { copia: util, origen: util ? "copia" : "ninguno" };
  }
}
