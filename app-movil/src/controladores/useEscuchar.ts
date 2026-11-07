import * as Speech from "expo-speech";
import { useCallback, useState } from "react";

export function useEscuchar() {
  const [aviso, setAviso] = useState<string | null>(null);

  const escuchar = useCallback(async (texto: string) => {
    const voces = await Speech.getAvailableVoicesAsync();
    const voz = voces.find((item) => item.language === "es-PE") ??
      voces.find((item) => item.language === "es-419");
    if (!voz) {
      setAviso("No hay una voz disponible en español.");
      return;
    }
    setAviso(null);
    Speech.speak(texto, { language: voz.language });
  }, []);

  const repetir = useCallback((texto: string) => escuchar(texto), [escuchar]);
  const silenciar = useCallback(() => Speech.stop(), []);

  return { escuchar, repetir, silenciar, aviso };
}
