/**
 * Controlador. Aplica lo elegido en «¿Algo de esto te pasa?» (B4) al resto de la app:
 * voz y vibración (oigo poco), letra (veo poco), detector de caídas (vivo solo) y ficha de
 * emergencia (camino poco). Las reglas están en modelos/efectosSituaciones.ts.
 */
import { leerEmergencia, guardarEmergencia } from "../modelos/local/emergenciaBase";
import type { Situacion } from "../modelos/local/situaciones";
import { mensajeConCaminar, preferenciasPorSituaciones } from "../modelos/efectosSituaciones";
import type { TamanoLetra } from "../modelos/local/preferencias";
import { ajustarVozPorSituaciones } from "./useEscuchar";

type Prefs = {
  tamano: TamanoLetra;
  detectarCaidas: boolean;
  setTamano: (t: TamanoLetra) => void;
  setDetectarCaidas: (v: boolean) => void;
};

export async function aplicarSituaciones(lista: Situacion[], prefs: Prefs): Promise<void> {
  ajustarVozPorSituaciones(lista);
  const cambios = preferenciasPorSituaciones(lista, prefs);
  if (cambios.tamano) prefs.setTamano(cambios.tamano);
  if (cambios.detectarCaidas) prefs.setDetectarCaidas(true);
  try {
    const ficha = await leerEmergencia();
    const mensaje = mensajeConCaminar(ficha.mensaje, lista.includes("camino_poco"));
    if (mensaje !== (ficha.mensaje ?? "")) await guardarEmergencia({ ...ficha, mensaje });
  } catch {
    // La ficha es opcional: si no se puede leer, lo demás ya quedó aplicado.
  }
}
