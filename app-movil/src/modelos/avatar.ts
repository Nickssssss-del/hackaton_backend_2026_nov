/**
 * Modelo. Qué avatar mostrar en el Inicio (B1/B2). Regla pura, sin pantalla.
 * Se decide por la edad y el género que la persona dio en A4, no por el modo: hay personas
 * mayores que usan el modo completo y jóvenes que prefieren el sencillo.
 * - 60 años o más → señora o señor; menos de 60 → joven mujer o joven hombre.
 * - Sin edad: se usa el modo como pista (sencillo → mayor).
 * - «Prefiero no decir» o sin género: señora si es mayor, joven hombre si no (los del Mockup v4).
 */
import type { Genero } from "./tipos";

export type TipoAvatar = "senora" | "senor" | "jovenMujer" | "jovenHombre";

export const EDAD_MAYOR = 60;

export function elegirAvatar(datos: { edad?: number; genero?: Genero; modo?: "sencillo" | "completo" | null }): TipoAvatar {
  const mayor = typeof datos.edad === "number" ? datos.edad >= EDAD_MAYOR : datos.modo !== "completo";
  if (datos.genero === "hombre") return mayor ? "senor" : "jovenHombre";
  if (datos.genero === "mujer") return mayor ? "senora" : "jovenMujer";
  return mayor ? "senora" : "jovenHombre";
}
