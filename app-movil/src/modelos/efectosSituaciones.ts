/**
 * Modelo. Qué cambia en la app según «¿Algo de esto te pasa?» (B4). Sin React: se prueba solo.
 * - Oigo poco: voz más lenta y fuerte, y el teléfono vibra cuando la app avisa algo importante.
 * - Veo poco: letra Grande como mínimo.
 * - Vivo solo: detectar caídas encendido (si me caigo, la app pregunta y avisa sola).
 * - Camino poco: la ficha de emergencia dice «me cuesta caminar» (rescatistas y tiempos a pie).
 * - Tomo pastillas: el Inicio muestra la próxima pastilla.
 */
import type { Situacion } from "./local/situaciones";

export const EFECTO_DE: Record<Exclude<Situacion, "ninguna">, string> = {
  oigo_poco: "La voz habla más lento y fuerte, y el teléfono vibra en cada aviso importante.",
  veo_poco: "La letra se pone Grande.",
  vivo_solo: "Se enciende «Detectar caídas»: si te caes, te pregunto y aviso sola.",
  camino_poco: "Tu ficha de emergencia dice que te cuesta caminar.",
  tomo_pastillas: "En el Inicio ves tu próxima pastilla.",
};

export function efectosDe(lista: readonly Situacion[]): string[] {
  return lista.filter((s): s is Exclude<Situacion, "ninguna"> => s !== "ninguna").map((s) => EFECTO_DE[s]);
}

/** Cambios de preferencias que pide la lista (solo se ENCIENDEN cosas, nunca se apagan solas). */
export function preferenciasPorSituaciones(
  lista: readonly Situacion[],
  actuales: { tamano: "normal" | "grande" | "enorme"; detectarCaidas: boolean },
): { tamano?: "grande"; detectarCaidas?: true } {
  return {
    ...(lista.includes("veo_poco") && actuales.tamano === "normal" ? { tamano: "grande" as const } : {}),
    ...(lista.includes("vivo_solo") && !actuales.detectarCaidas ? { detectarCaidas: true as const } : {}),
  };
}

/** Agrega o quita «Me cuesta caminar.» del mensaje de la ficha, sin tocar lo demás. */
export function mensajeConCaminar(mensaje: string | undefined, caminoPoco: boolean): string {
  const FRASE = "Me cuesta caminar.";
  const base = (mensaje ?? "").replace(FRASE, "").replace(/\s{2,}/g, " ").trim();
  return caminoPoco ? `${base}${base ? " " : ""}${FRASE}` : base;
}
