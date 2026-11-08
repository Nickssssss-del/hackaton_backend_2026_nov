/**
 * Modelo. Fotos del bucket privado `fotos` (script 07). Ruta: <zona_id>/<user_id>/<archivo>.
 * El bucket es privado: se muestran con una URL firmada que vence. La RLS de Storage solo deja ver
 * fotos de la propia zona. Subir fotos queda pendiente: necesita una librería de cámara (cambio
 * nativo que el equipo debe aprobar, decisión D-09).
 */
import { obtenerSupabase } from "./supabase";

const BUCKET = "fotos";
const DURACION_S = 60 * 60;

const cache = new Map<string, { url: string; vence: number }>();

/** URL temporal para mostrar la foto; null si no se puede (sin permiso, borrada o sin internet). */
export async function urlDeFoto(ruta: string): Promise<string | null> {
  const guardada = cache.get(ruta);
  if (guardada && guardada.vence > Date.now()) return guardada.url;
  const { data, error } = await obtenerSupabase().storage.from(BUCKET).createSignedUrl(ruta, DURACION_S);
  if (error || !data?.signedUrl) return null;
  cache.set(ruta, { url: data.signedUrl, vence: Date.now() + (DURACION_S - 60) * 1000 });
  return data.signedUrl;
}
