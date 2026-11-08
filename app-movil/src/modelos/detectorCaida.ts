/**
 * Modelo. Reconoce una caída en la serie de aceleración total (en g), sin depender del sensor:
 * caída libre (< 0,4 g por 80 ms o más) → golpe (> 2,5 g antes de 1,5 s) → quietud (2 s cerca de 1 g).
 */
const UMBRAL_CAIDA_LIBRE_G = 0.4;
const DURACION_CAIDA_LIBRE_MS = 80;
const UMBRAL_GOLPE_G = 2.5;
const VENTANA_GOLPE_MS = 1500;
const VENTANA_QUIETUD_MS = 2000;
const TOLERANCIA_QUIETUD_G = 0.35;

type Fase =
  | { tipo: "normal" }
  | { tipo: "cayendo"; desde: number }
  | { tipo: "esperando_golpe"; hasta: number }
  | { tipo: "quietud"; desde: number; quietas: number; total: number };

/** Lógica pura, para poder probarla sin sensor. Devuelve true cuando detecta una caída. */
export function crearDetector() {
  let fase: Fase = { tipo: "normal" };
  return (g: number, ahora: number): boolean => {
    switch (fase.tipo) {
      case "normal":
        if (g < UMBRAL_CAIDA_LIBRE_G) fase = { tipo: "cayendo", desde: ahora };
        return false;
      case "cayendo":
        if (g < UMBRAL_CAIDA_LIBRE_G) return false;
        fase = ahora - fase.desde >= DURACION_CAIDA_LIBRE_MS ? { tipo: "esperando_golpe", hasta: ahora + VENTANA_GOLPE_MS } : { tipo: "normal" };
        if (fase.tipo === "esperando_golpe" && g > UMBRAL_GOLPE_G) fase = { tipo: "quietud", desde: ahora, quietas: 0, total: 0 };
        return false;
      case "esperando_golpe":
        if (ahora > fase.hasta) fase = { tipo: "normal" };
        else if (g > UMBRAL_GOLPE_G) fase = { tipo: "quietud", desde: ahora, quietas: 0, total: 0 };
        return false;
      case "quietud": {
        const total = fase.total + 1;
        const quietas = fase.quietas + (Math.abs(g - 1) < TOLERANCIA_QUIETUD_G ? 1 : 0);
        if (ahora - fase.desde < VENTANA_QUIETUD_MS) {
          fase = { ...fase, total, quietas };
          return false;
        }
        fase = { tipo: "normal" };
        // Quieta la mayor parte del tiempo después del golpe: probable caída.
        return total > 0 && quietas / total >= 0.7;
      }
    }
  };
}
