import * as Speech from "expo-speech";
import { useCallback, useState } from "react";
import { usePreferencias } from "./PreferenciasContexto";

export function useEscuchar() {
  const [aviso, setAviso] = useState<string | null>(null);
  const { sonidos } = usePreferencias();

  const escuchar = useCallback(async (texto: string, forzar = false) => {
    if (!sonidos && !forzar) return;
    const voces = await Speech.getAvailableVoicesAsync();
    const voz = voces.find((item) => item.language === "es-PE") ??
      voces.find((item) => item.language === "es-419");
    if (!voz) {
      setAviso("No hay una voz disponible en español.");
      return;
    }
    setAviso(null);
    Speech.speak(texto, { language: voz.language });
  }, [sonidos]);

  const repetir = useCallback((texto: string) => escuchar(texto, true), [escuchar]);
  const silenciar = useCallback(() => Speech.stop(), []);

  return { escuchar, repetir, silenciar, aviso };
}
