// Único punto que conoce al proveedor de IA: cualquier API compatible con OpenAI, sin SDK.
// Por defecto Groq; se cambia de proveedor con los secretos IA_URL, IA_API_KEY e IA_MODELO.
// Recibe solo el texto de quien pregunta.
import type { LlamadaIA } from "./handler.ts";
import { HERRAMIENTAS } from "./herramientas.ts";

export const URL_POR_DEFECTO = "https://api.groq.com/openai/v1/chat/completions";

const SISTEMA =
  "Eres el asistente de la app Kuna, para adultos mayores de un barrio de Ica, Perú. " +
  "Lee lo que pide la persona y llama exactamente a una de las herramientas. " +
  "Las horas van en formato de 24 horas: las 8 de la noche son 20:00. " +
  "Si lo que pide no encaja con ninguna herramienta, no llames ninguna y responde con una frase corta.";

// Groq puede rechazar pattern y format en los esquemas; se quitan solo aquí.
// La validación real (hora HH:MM, uuid) la sigue haciendo validarLlamada en herramientas.ts.
function sinPatternNiFormat(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(sinPatternNiFormat);
  if (typeof valor !== "object" || valor === null) return valor;
  return Object.fromEntries(
    Object.entries(valor)
      .filter(([clave]) => clave !== "pattern" && clave !== "format")
      .map(([clave, v]) => [clave, sinPatternNiFormat(v)]),
  );
}

const TOOLS = HERRAMIENTAS.map((h) => ({
  type: "function",
  function: { name: h.nombre, description: h.descripcion, parameters: sinPatternNiFormat(h.parametros) },
}));

interface Opciones {
  apiKey?: string;
  modelo?: string;
  url?: string;
  enviar?: typeof fetch;
  timeoutMs?: number;
}

/** Un proveedor completo: con respaldo no hay valores por defecto. */
export interface Proveedor {
  apiKey: string;
  modelo: string;
  url: string;
}

// Principal 5 s + respaldo 8 s: la respuesta no pasa de ~13 s.
const TIEMPO_PRINCIPAL_MS = 5_000;
const TIEMPO_RESPALDO_MS = 8_000;

/** Devuelve la función que eligió la IA, o null si no eligió ninguna o sus argumentos no se pueden leer. */
export async function llamarIA(
  texto: string,
  {
    apiKey = Deno.env.get("IA_API_KEY"),
    modelo = Deno.env.get("IA_MODELO") ?? "openai/gpt-oss-20b",
    url = Deno.env.get("IA_URL") || URL_POR_DEFECTO,
    enviar = fetch,
    timeoutMs = TIEMPO_RESPALDO_MS,
  }: Opciones = {},
): Promise<LlamadaIA | null> {
  if (!apiKey) throw new Error("FALTA_IA_API_KEY");

  const respuesta = await enviar(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelo,
      messages: [
        { role: "system", content: SISTEMA },
        { role: "user", content: texto },
      ],
      tools: TOOLS,
      tool_choice: "auto",
    }),
    // La app espera una respuesta rápida o los botones de siempre.
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!respuesta.ok) throw new Error(`IA_HTTP_${respuesta.status}`);

  const cuerpo = await respuesta.json();
  const llamada = cuerpo?.choices?.[0]?.message?.tool_calls?.[0]?.function;
  if (!llamada) return null;
  try {
    // arguments llega como texto JSON.
    return { nombre: llamada.name, argumentos: JSON.parse(llamada.arguments) };
  } catch {
    return null;
  }
}

/** Respaldo desde los secretos. Sin clave, modelo o URL no hay respaldo (no tiene valores por defecto). */
export function respaldoDesdeEntorno(): Proveedor | null {
  const apiKey = Deno.env.get("IA_RESPALDO_API_KEY");
  const modelo = Deno.env.get("IA_RESPALDO_MODELO");
  const url = Deno.env.get("IA_RESPALDO_URL");
  return apiKey && modelo && url ? { apiKey, modelo, url } : null;
}

/** Solo un código: nunca el mensaje entero, que puede traer URLs u otros datos. */
function codigoDeError(error: unknown): string {
  if (!(error instanceof Error)) return "desconocido";
  return /^[A-Z][A-Z0-9_]*$/.test(error.message) ? error.message : error.name;
}

interface OpcionesRespaldo {
  principal?: Opciones;
  respaldo?: Proveedor | null;
  enviar?: typeof fetch;
  avisar?: (mensaje: string) => void;
}

/**
 * Llama a la IA principal (5 s). Si lanza error (HTTP no OK, tiempo agotado o red) y hay respaldo,
 * reintenta una vez con el respaldo (8 s). Si la principal responde sin elegir herramienta (null),
 * esa es la respuesta: no se usa el respaldo. Sin respaldo, o si también falla, se lanza el error.
 */
export async function llamarIAConRespaldo(
  texto: string,
  {
    principal = {},
    respaldo = respaldoDesdeEntorno(),
    enviar = fetch,
    avisar = (mensaje) => console.warn(mensaje),
  }: OpcionesRespaldo = {},
): Promise<LlamadaIA | null> {
  try {
    return await llamarIA(texto, { ...principal, enviar, timeoutMs: TIEMPO_PRINCIPAL_MS });
  } catch (error) {
    if (!respaldo) throw error;
    avisar(`IA principal falló: ${codigoDeError(error)}, usando respaldo`);
    return await llamarIA(texto, { ...respaldo, enviar, timeoutMs: TIEMPO_RESPALDO_MS });
  }
}
