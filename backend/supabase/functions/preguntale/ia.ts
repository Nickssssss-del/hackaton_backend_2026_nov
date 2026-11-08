// Único punto que conoce al proveedor de IA (Groq, API compatible con OpenAI, sin SDK).
// Cambiar de proveedor es cambiar este archivo. Recibe solo el texto de quien pregunta.
import type { LlamadaIA } from "./handler.ts";
import { HERRAMIENTAS } from "./herramientas.ts";

const URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";

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
  enviar?: typeof fetch;
}

/** Devuelve la función que eligió la IA, o null si no eligió ninguna o sus argumentos no se pueden leer. */
export async function llamarIA(
  texto: string,
  {
    apiKey = Deno.env.get("IA_API_KEY"),
    modelo = Deno.env.get("IA_MODELO") ?? "openai/gpt-oss-20b",
    enviar = fetch,
  }: Opciones = {},
): Promise<LlamadaIA | null> {
  if (!apiKey) throw new Error("FALTA_IA_API_KEY");

  const respuesta = await enviar(URL_GROQ, {
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
    signal: AbortSignal.timeout(8_000),
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
