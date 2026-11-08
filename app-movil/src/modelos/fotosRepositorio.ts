/**
 * Modelo. Fotos del bucket privado `fotos` (script 07). Ruta: <zona_id>/<user_id>/<archivo>.
 * El bucket es privado: se muestran con una URL firmada que vence. La RLS de Storage solo deja ver
 * fotos de la propia zona. Para subir, la política fotos_subir exige: carpeta 1 = mi zona,
 * carpeta 2 = mi usuario y perfil completo. Máximo 5 MB; JPEG, PNG o WebP.
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

/** Base64 → bytes. Hermes trae atob; no hace falta otra librería. */
function bytesDeBase64(base64: string): Uint8Array {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Sube una foto a <zona>/<usuario>/<archivo> y devuelve la ruta para guardarla en foto_path.
 * `zonaId` es la del perfil (la misma que mi_zona() en la base).
 */
export async function subirFoto(base64: string, tipo: string, zonaId: string): Promise<string> {
  const supabase = obtenerSupabase();
  const { data, error: sesionError } = await supabase.auth.getUser();
  if (sesionError) throw sesionError;
  const usuario = data.user?.id;
  if (!usuario) throw new Error("SIN_SESION");
  const mime = EXTENSION[tipo] ? tipo : "image/jpeg";
  const bytes = bytesDeBase64(base64);
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("FOTO_MUY_GRANDE");
  const ruta = `${zonaId}/${usuario}/${Date.now()}.${EXTENSION[mime]}`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, bytes, { contentType: mime, upsert: false });
  if (error) throw error;
  cache.delete(ruta);
  return ruta;
}

/** Borra una foto propia (por ejemplo, al reemplazarla). Si falla, no es grave: queda huérfana. */
export async function borrarFoto(ruta: string): Promise<void> {
  await obtenerSupabase().storage.from(BUCKET).remove([ruta]);
  cache.delete(ruta);
}
