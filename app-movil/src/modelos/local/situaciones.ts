/**
 * Modelo. B4 · ¿Algo de esto te pasa? (Mockup v4, p. 11). Solo en el teléfono.
 * Son datos sensibles (salud): no salen del dispositivo sin consentimiento explícito (INC-37).
 */
import { guardarJson, leerJson } from "../almacen";

export type Situacion = "vivo_solo" | "oigo_poco" | "veo_poco" | "camino_poco" | "tomo_pastillas" | "ninguna";

export function leerSituaciones(): Promise<Situacion[]> {
  return leerJson<Situacion[]>("situaciones", []);
}

export async function guardarSituaciones(lista: Situacion[]): Promise<void> {
  await guardarJson("situaciones", lista);
}

/** «Ninguna» excluye a las demás, y elegir otra quita «Ninguna». */
export function alternarSituacion(actual: Situacion[], tocada: Situacion): Situacion[] {
  if (actual.includes(tocada)) return actual.filter((s) => s !== tocada);
  if (tocada === "ninguna") return ["ninguna"];
  return [...actual.filter((s) => s !== "ninguna"), tocada];
}
