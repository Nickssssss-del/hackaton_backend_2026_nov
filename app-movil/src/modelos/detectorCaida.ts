/**
 * Modelo. Reconoce una caída en la serie de aceleración total (en g), sin depender del sensor:
 *   1. caída libre: < 0,6 g durante 100 ms o más (≈ 5 cm de caída; desde la mano son 200-300 ms);
 *   2. golpe: antes de 1 s, un pico > 1,6 g (una cama o un sofá frenan suave: 1,6-2,5 g;
 *      el piso pasa de 3 g). También vale si la caída libre termina de golpe en un pico así;
 *   3. quietud: en los 1,5 s siguientes casi no se mueve (cerca de 1 g la mayor parte del tiempo).
 * La versión anterior pedía > 2,5 g y muestreaba cada 50 ms: sobre una cama casi nunca se cumplía.
 */
export const UMBRAL_CAIDA_LIBRE_G = 0.6;
export const DURACION_CAIDA_LIBRE_MS = 100;
export const UMBRAL_GOLPE_G = 1.6;
const VENTANA_GOLPE_MS = 1000;
const VENTANA_QUIETUD_MS = 1500;
/** Después del golpe hay rebotes: se ignoran los primeros 300 ms al medir la quietud. */
const REBOTE_MS = 300;
const TOLERANCIA_QUIETUD_G = 0.3;
const PROPORCION_QUIETA = 0.65;

type Fase =
  | { tipo: "normal" }
  | { tipo: "cayendo"; desde: number }
  | { tipo: "esperando_golpe"; hasta: number }
  | { tipo: "quietud"; desde: number; quietas: number; total: number };

/** Lógica pura, para poder probarla sin sensor. Devuelve true cuando detecta una caída. */
export function crearDetector() {
  let fase: Fase = { tipo: "normal" };
  const golpe = (ahora: number): Fase => ({ tipo: "quietud", desde: ahora, quietas: 0, total: 0 });
  return (g: number, ahora: number): boolean => {
    switch (fase.tipo) {
      case "normal":
        if (g < UMBRAL_CAIDA_LIBRE_G) fase = { tipo: "cayendo", desde: ahora };
        return false;
      case "cayendo":
        if (g < UMBRAL_CAIDA_LIBRE_G) return false;
        if (ahora - fase.desde < DURACION_CAIDA_LIBRE_MS) {
          fase = { tipo: "normal" };
          return false;
        }
        // La caída libre terminó: si esta misma muestra ya es el golpe, se pasa a medir la quietud.
        fase = g > UMBRAL_GOLPE_G ? golpe(ahora) : { tipo: "esperando_golpe", hasta: ahora + VENTANA_GOLPE_MS };
        return false;
      case "esperando_golpe":
        if (g > UMBRAL_GOLPE_G) fase = golpe(ahora);
        else if (ahora > fase.hasta) fase = { tipo: "normal" };
        return false;
      case "quietud": {
        const transcurrido = ahora - fase.desde;
        if (transcurrido < REBOTE_MS) return false;
        const total = fase.total + 1;
        const quietas = fase.quietas + (Math.abs(g - 1) < TOLERANCIA_QUIETUD_G ? 1 : 0);
        if (transcurrido < REBOTE_MS + VENTANA_QUIETUD_MS) {
          fase = { ...fase, total, quietas };
          return false;
        }
        fase = { tipo: "normal" };
        // Quieta la mayor parte del tiempo después del golpe: probable caída.
        return total > 0 && quietas / total >= PROPORCION_QUIETA;
      }
    }
  };
}
