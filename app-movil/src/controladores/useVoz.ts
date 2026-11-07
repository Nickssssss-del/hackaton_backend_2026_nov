/**
 * Controlador. Voz a texto en español. Si falla el permiso o el motor, abre el teclado.
 */
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useState } from "react";

export function useVoz(alReconocer?: (texto: string) => void) {
  const [escuchando, setEscuchando] = useState(false);
  const [teclado, setTeclado] = useState(false);

  useSpeechRecognitionEvent("result", (evento) => {
    const texto = evento.results[0]?.transcript ?? "";
    if (evento.isFinal && texto.trim()) {
      alReconocer?.(texto.trim());
      setEscuchando(false);
    }
  });

  useSpeechRecognitionEvent("error", () => {
    setEscuchando(false);
    setTeclado(true);
  });

  useSpeechRecognitionEvent("end", () => {
    setEscuchando(false);
  });

  const alternar = async () => {
    if (escuchando) {
      ExpoSpeechRecognitionModule.stop();
      setEscuchando(false);
      return;
    }
    try {
      const permiso = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permiso.granted) {
        setTeclado(true);
        return;
      }
      setTeclado(false);
      setEscuchando(true);
      ExpoSpeechRecognitionModule.start({ lang: "es-PE", interimResults: true });
    } catch {
      try {
        setEscuchando(true);
        ExpoSpeechRecognitionModule.start({ lang: "es-419", interimResults: true });
      } catch {
        setEscuchando(false);
        setTeclado(true);
      }
    }
  };

  return { escuchando, teclado, alternar };
}
