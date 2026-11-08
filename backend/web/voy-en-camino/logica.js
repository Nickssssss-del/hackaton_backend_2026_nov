// Lógica de la página «Voy en camino», sin pantalla. La usa index.html y la prueba logica_test.js.
// Spec: backend/docs/spec_voy_en_camino.md

// El token de enlaces es dos uuid sin guiones: 64 hexadecimales en minúscula.
const FORMATO_TOKEN = /^[0-9a-f]{64}$/;

export const TEXTOS = {
  terminada: "Esta emergencia ya terminó",
  sin_conexion: "No hay conexión. Revisa tu internet.",
  error: "Algo salió mal. Inténtalo otra vez.",
};

/** Token de ?t= si tiene el formato de la base; si no, null (y no se llama a la base). */
export function leerToken(search) {
  const token = new URLSearchParams(search).get("t");
  return token && FORMATO_TOKEN.test(token) ? token : null;
}

function nombreVisible(nombre) {
  return (typeof nombre === "string" && nombre.trim()) || "Tu familiar";
}

export const textoAyuda = (nombre) => `${nombreVisible(nombre)} necesita ayuda`;
export const textoGracias = (nombre) => `Gracias, ${nombreVisible(nombre)} sabe que vas`;

/** URL de Google Maps con las coordenadas, o null si faltan o no son números. */
export function urlMapa(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return `https://www.google.com/maps?q=${la},${ln}`;
}

/** Estado de pantalla a partir de las filas de enlace_ver. */
export function estadoDesdeVer(filas) {
  const fila = Array.isArray(filas) ? filas[0] : null;
  if (!fila) return { tipo: "terminada", titulo: TEXTOS.terminada };
  const nombre = nombreVisible(fila.nombre);
  return {
    tipo: fila.va_en_camino ? "gracias" : "ayuda",
    nombre,
    titulo: fila.va_en_camino ? textoGracias(nombre) : textoAyuda(nombre),
    direccion: (typeof fila.direccion === "string" && fila.direccion.trim()) || null,
    mapa: urlMapa(fila.lat, fila.lng),
  };
}

/** Después de enlace_voy: pasa a gracias y conserva la dirección y el mapa. */
export function estadoTrasVoy(estado) {
  return { ...estado, tipo: "gracias", titulo: textoGracias(estado.nombre) };
}

/**
 * EMERGENCIA_TERMINADA → terminada; fallo de red (fetch lanza TypeError) o tope de tiempo → sin conexión;
 * lo demás → error.
 */
export function estadoDesdeError(error) {
  if (error instanceof Error && error.message.includes("EMERGENCIA_TERMINADA")) {
    return { tipo: "terminada", titulo: TEXTOS.terminada };
  }
  if (error instanceof TypeError || error?.name === "TimeoutError") {
    return { tipo: "sin_conexion", titulo: TEXTOS.sin_conexion };
  }
  return { tipo: "error", titulo: TEXTOS.error };
}

/** POST a una función de la base con la clave publicable. Lanza el message de la base si responde con error. */
export async function llamarRpc(config, funcion, token, enviar = fetch) {
  const base = config.SUPABASE_URL.replace(/\/+$/, "");
  const respuesta = await enviar(`${base}/rest/v1/rpc/${funcion}`, {
    method: "POST",
    headers: { apikey: config.SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token }),
    credentials: "omit",
    // Una red móvil colgada no debe dejar la página en «Cargando…» para siempre.
    signal: AbortSignal.timeout(10_000),
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.message ?? `HTTP_${respuesta.status}`);
  }
  return respuesta.json();
}
