/**
 * Modelo. Zonas del barrio (lectura pública). Sirven para el filtro «Zona»
 * y para ubicar una emergencia en su zona sin mostrar su ubicación.
 */
import { demoZonas } from "./demo";
import { cliente, enDemo } from "./supabase";

export interface Zona {
  id: string;
  nombre: string;
  lat_centro: number;
  lng_centro: number;
  radio_m: number;
}

let cache: Promise<Zona[]> | null = null;

export function listarZonas(): Promise<Zona[]> {
  if (enDemo()) return Promise.resolve(demoZonas());
  cache ??= (async () => {
    const { data, error } = await cliente()
      .from("zonas")
      .select("id, nombre, lat_centro, lng_centro, radio_m")
      .order("nombre");
    if (error) {
      cache = null;
      throw error;
    }
    return ((data ?? []) as Zona[]).map((z) => ({
      ...z,
      lat_centro: Number(z.lat_centro),
      lng_centro: Number(z.lng_centro),
    }));
  })();
  return cache;
}

export function olvidarZonas(): void {
  cache = null;
}

/** Distancia aproximada en metros entre dos puntos (haversine). */
function distanciaM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/**
 * Zona cuyo centro está más cerca de la ubicación aproximada (3 decimales).
 * Solo devuelve el nombre de la zona: la ubicación no sale de este módulo.
 */
export function zonaDeUbicacion(zonas: Zona[], lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null || zonas.length === 0) return null;
  let mejor: { nombre: string; d: number } | null = null;
  for (const z of zonas) {
    const d = distanciaM(Number(lat), Number(lng), z.lat_centro, z.lng_centro);
    if (!mejor || d < mejor.d) mejor = { nombre: z.nombre, d };
  }
  return mejor?.nombre ?? null;
}
