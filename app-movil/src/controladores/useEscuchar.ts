/**
 * Controlador. Leer en voz alta (botón 🔊 de cada pantalla, avisos de emergencia y pastillas).
 *
 * Antes solo hablaba si el teléfono tenía una voz exactamente «es-PE» o «es-419». Casi ningún
 * Android las tiene (Google trae «es-US», «es-ES» o «es-MX», a veces escritas «es_US»), así que
 * el botón no hacía nada. Ahora elige la mejor voz en español que haya y, si no encuentra
 * ninguna, igual habla en español con la voz por defecto del teléfono.
 * - Tocar 🔊 mientras habla lo calla (para no tener que esperar).
 * - `fuerte`: más lento y claro, para la emergencia y para «escucho poco».
 */
import * as Speech from "expo-speech";
import { useCallback, useState } from "react";
import { usePreferencias } from "./PreferenciasContexto";

const PREFERIDAS = ["es-pe", "es-419", "es-us", "es-mx", "es-co", "es-cl", "es-ar", "es-es"];

let vozElegida: { identificador?: string; idioma: string } | null = null;
/** «Oigo poco» (B4): siempre más lento y claro. */
let siempreFuerte = false;

export function ajustarVozPorSituaciones(situaciones: readonly string[]): void {
  siempreFuerte = situaciones.includes("oigo_poco");
}

async function elegirVoz(): Promise<{ identificador?: string; idioma: string }> {
  if (vozElegida) return vozElegida;
  try {
    const voces = await Speech.getAvailableVoicesAsync();
    const normal = (l: string) => l.toLowerCase().replace("_", "-");
    const espanol = voces.filter((v) => normal(v.language).startsWith("es"));
    // Primero voces del teléfono (no de red), en el orden de PREFERIDAS.
    const ordenadas = [...espanol].sort((a, b) => {
      const ia = PREFERIDAS.indexOf(normal(a.language).slice(0, 6));
      const ib = PREFERIDAS.indexOf(normal(b.language).slice(0, 6));
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const v = ordenadas[0];
    vozElegida = v ? { identificador: v.identifier, idioma: v.language } : { idioma: "es-US" };
  } catch {
    vozElegida = { idioma: "es-US" };
  }
  return vozElegida;
}

export async function decir(texto: string, opciones: { fuerte?: boolean; alTerminar?: () => void } = {}): Promise<void> {
  const voz = await elegirVoz();
  Speech.stop();
  Speech.speak(texto, {
    language: voz.idioma,
    voice: voz.identificador,
    rate: opciones.fuerte || siempreFuerte ? 0.8 : 0.95,
    pitch: 1,
    volume: 1,
    onDone: opciones.alTerminar,
    onStopped: undefined,
    onError: () => {
      // Si la voz elegida falla, se intenta una vez con la voz por defecto.
      vozElegida = { idioma: "es-US" };
      Speech.speak(texto, { language: "es-US", rate: 0.95, onDone: opciones.alTerminar });
    },
  });
}

export function useEscuchar() {
  const [aviso, setAviso] = useState<string | null>(null);
  const { sonidos } = usePreferencias();

  const escuchar = useCallback(
    async (texto: string, forzar = false, fuerte = false) => {
      if (!sonidos && !forzar) return;
      if (!texto.trim()) return;
      setAviso(null);
      try {
        await decir(texto, { fuerte });
      } catch {
        setAviso("Este teléfono no tiene voz en español. Instálala en Ajustes › Texto a voz.");
      }
    },
    [sonidos],
  );

  /** Botón 🔊: si ya está hablando, calla; si no, lee la pantalla. */
  const alternar = useCallback(async (texto: string) => {
    if (await Speech.isSpeakingAsync()) {
      Speech.stop();
      return;
    }
    await decir(texto);
  }, []);

  const repetir = useCallback((texto: string) => escuchar(texto, true), [escuchar]);
  const silenciar = useCallback(() => Speech.stop(), []);

  return { escuchar, repetir, silenciar, alternar, aviso };
}
