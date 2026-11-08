/**
 * Controlador. Ubicación en dos tiempos, para que el mapa y la emergencia no esperen al GPS:
 * 1. `ubicacionConocida()`: al instante, lo que ya se sabe: la última del sistema (≤ 30 min),
 *    la última guardada por la app, o la de la casa (registro).
 * 2. `ubicacionGps(ms)`: la del GPS ahora, con tiempo máximo; si no llega, `null`.
 * Todo queda en el teléfono; nada de esto sube a la nube.
 */
import * as Location from "expo-location";
import { leerPerfilLocal } from "../modelos/local/perfil";
import { guardarUltimaUbicacion, leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";

export type FuenteUbicacion = "gps" | "reciente" | "guardada" | "casa";
export type Ubicacion = { lat: number; lng: number; fuente: FuenteUbicacion };

const MEDIA_HORA = 30 * 60 * 1000;

/** Texto corto para mostrar de dónde salió el punto del mapa. */
export const TEXTO_FUENTE: Record<FuenteUbicacion, string> = {
  gps: "Tu ubicación ahora",
  reciente: "Tu ubicación de hace un rato",
  guardada: "La última ubicación que guardé",
  casa: "La ubicación de tu casa",
};

export async function ubicacionConocida(): Promise<Ubicacion | null> {
  try {
    const permiso = await Location.getForegroundPermissionsAsync();
    if (permiso.granted) {
      const ultima = await Location.getLastKnownPositionAsync({ maxAge: MEDIA_HORA });
      if (ultima) return { lat: ultima.coords.latitude, lng: ultima.coords.longitude, fuente: "reciente" };
    }
  } catch {
    // sigue con lo guardado
  }
  const guardada = await leerUltimaUbicacion();
  if (guardada) return { lat: guardada.lat, lng: guardada.lng, fuente: "guardada" };
  const perfil = await leerPerfilLocal();
  if (perfil?.lat !== undefined && perfil?.lng !== undefined) return { lat: perfil.lat, lng: perfil.lng, fuente: "casa" };
  return null;
}

/** GPS ahora (pide permiso si hace falta). Alta precisión para emergencias; equilibrada para lo demás. */
export async function ubicacionGps(ms: number, alta = false): Promise<Ubicacion | null> {
  try {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) return null;
    const p = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: alta ? Location.Accuracy.High : Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), ms)),
    ]);
    if (!p) return null;
    const u = { lat: p.coords.latitude, lng: p.coords.longitude };
    await guardarUltimaUbicacion({ ...u, fecha: new Date().toISOString() });
    return { ...u, fuente: "gps" };
  } catch {
    return null;
  }
}
