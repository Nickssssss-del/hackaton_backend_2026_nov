/**
 * Controlador. Voz a texto en español. Si falla el permiso o el motor, abre el teclado.
 */
import { useEffect, useState } from "react";

let modulo: any = null;
try {
  modulo = require("expo-speech-recognition");
} catch {
  modulo = null; // Expo Go: no hay módulo nativo
}

export function useVoz(alReconocer?: (texto: string) => void) {
  const [escuchando, setEscuchando] = useState(false);
  const [teclado, setTeclado] = useState(false);
  const disponible = modulo !== null;

  useEffect(() => {
    if (!disponible) return;

    const suscripcionResultado = modulo.ExpoSpeechRecognitionModule.addListener("result", (evento: any) => {
      const texto = evento.results[0]?.transcript ?? "";
      if (evento.isFinal && texto.trim()) {
        alReconocer?.(texto.trim());
        setEscuchando(false);
      }
    });

    const suscripcionError = modulo.ExpoSpeechRecognitionModule.addListener("error", () => {
      setEscuchando(false);
      setTeclado(true);
    });

    const suscripcionFin = modulo.ExpoSpeechRecognitionModule.addListener("end", () => {
      setEscuchando(false);
    });

    return () => {
      suscripcionResultado?.remove?.();
      suscripcionError?.remove?.();
      suscripcionFin?.remove?.();
    };
  }, [disponible, alReconocer]);

  const alternar = async () => {
    if (escuchando) {
      if (disponible) {
        modulo.ExpoSpeechRecognitionModule.stop();
      }
      setEscuchando(false);
      return;
    }

    if (!disponible) {
      setTeclado(true);
      return;
    }

    try {
      const permiso = await modulo.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permiso.granted) {
        setTeclado(true);
        return;
      }
      setTeclado(false);
      setEscuchando(true);
      try {
        modulo.ExpoSpeechRecognitionModule.start({ lang: "es-PE", interimResults: true });
      } catch {
        modulo.ExpoSpeechRecognitionModule.start({ lang: "es-419", interimResults: true });
      }
    } catch {
      setEscuchando(false);
      setTeclado(true);
    }
  };

  return { escuchando, teclado, alternar, disponible };
}