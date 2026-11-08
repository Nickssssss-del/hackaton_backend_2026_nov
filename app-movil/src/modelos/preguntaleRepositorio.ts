/**
 * Modelo. «Pregúntale a Vecinos» (D1). Llama a la Edge Function `preguntale`
 * (backend/supabase/functions/preguntale, spec en backend/docs/spec_preguntale.md).
 *
 * - POST con la sesión de la app. A la IA solo llega `texto`; lat, lng y zona_id solo sirven para
 *   ordenar servicios y no se envían a la IA.
 * - Devuelve una sola de 6 funciones. La función solo busca servicios: todo lo demás (recordatorio,
 *   horario, pedir ayuda, llamar, cómo llegar) lo ejecuta la app en el teléfono.
 */
import type {
  BotonPreguntale,
  FuncionPreguntale,
  PreguntaPreguntale,
  RespuestaPreguntale,
  ServicioEncontrado,
} from "./preguntale";
import { obtenerSupabase } from "./supabase";

export type { RespuestaPreguntale, ServicioEncontrado } from "./preguntale";

const FUNCIONES: readonly FuncionPreguntale[] = [
  "buscar_servicio",
  "crear_recordatorio",
  "ver_mi_horario",
  "pedir_ayuda",
  "llamar",
  "como_llegar",
];

export async function preguntar(p: PreguntaPreguntale): Promise<RespuestaPreguntale> {
  const cuerpo: Record<string, unknown> = { texto: p.texto };
  if (typeof p.lat === "number" && typeof p.lng === "number") {
    cuerpo.lat = p.lat;
    cuerpo.lng = p.lng;
  }
  if (p.zonaId) cuerpo.zona_id = p.zonaId;

  const { data, error } = await obtenerSupabase().functions.invoke("preguntale", { body: cuerpo });
  if (error) throw await errorConCodigo(error);
  return normalizar(data);
}

/** Las Edge Functions responden { error: "CODIGO" }: se lleva el código al mensaje del error. */
async function errorConCodigo(error: unknown): Promise<Error> {
  const contexto = (error as { context?: { json?: () => Promise<unknown> } }).context;
  if (contexto && typeof contexto.json === "function") {
    try {
      const cuerpo = (await contexto.json()) as { error?: unknown };
      if (typeof cuerpo?.error === "string") return new Error(cuerpo.error);
    } catch {
      // Respuesta sin JSON: se usa el error original.
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

function normalizar(data: unknown): RespuestaPreguntale {
  const r = (data ?? {}) as Record<string, unknown>;
  const funcion = FUNCIONES.includes(r.funcion as FuncionPreguntale) ? (r.funcion as FuncionPreguntale) : null;
  const servicios = Array.isArray(r.servicios) ? r.servicios : [];
  const botones = Array.isArray(r.botones) ? r.botones : [];
  return {
    texto: typeof r.texto === "string" ? r.texto : "No te entendí. ¿Qué necesitas?",
    funcion,
    argumentos: objeto(r.argumentos),
    confirmar: r.confirmar === true,
    servicios: servicios.map((s) => {
      const f = objeto(s);
      return {
        id: String(f.id ?? ""),
        nombre: typeof f.nombre === "string" ? f.nombre : "Negocio",
        oficio: typeof f.oficio === "string" ? f.oficio : "otro",
        abiertoAhora: typeof f.abierto_ahora === "boolean" ? f.abierto_ahora : null,
        vistosBuenosTotal: Number(f.vistos_buenos_total) || 0,
        contacto: typeof f.contacto === "string" && f.contacto ? f.contacto : null,
        lat: numeroONulo(f.lat),
        lng: numeroONulo(f.lng),
      };
    }),
    botones: botones.map((b) => {
      const f = objeto(b);
      return {
        etiqueta: typeof f.etiqueta === "string" ? f.etiqueta : "",
        funcion: FUNCIONES.includes(f.funcion as FuncionPreguntale) ? (f.funcion as FuncionPreguntale) : null,
        argumentos: objeto(f.argumentos),
      };
    }).filter((b) => b.etiqueta),
  };
}

function objeto(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function numeroONulo(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
