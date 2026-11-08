/**
 * Controlador. Voz a texto en español. Si falla el permiso o el motor, abre el teclado.
 */
import { useEffect, useRef, useState } from "react";

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
  // El motor de voz es uno solo para toda la app: cada campo con micrófono registra sus oyentes,
  // así que solo el campo que empezó a escuchar debe recibir lo dictado (si no, se llenan todos).
  const activo = useRef(false);

  useEffect(() => {
    if (!disponible) return;

    const suscripcionResultado = modulo.ExpoSpeechRecognitionModule.addListener("result", (evento: any) => {
      const texto = evento.results[0]?.transcript ?? "";
      if (!activo.current) return;
      if (evento.isFinal && texto.trim()) {
        activo.current = false;
        alReconocer?.(texto.trim());
        setEscuchando(false);
      }
    });

    const suscripcionError = modulo.ExpoSpeechRecognitionModule.addListener("error", () => {
      if (!activo.current) return;
      activo.current = false;
      setEscuchando(false);
      setTeclado(true);
    });

    const suscripcionFin = modulo.ExpoSpeechRecognitionModule.addListener("end", () => {
      activo.current = false;
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
      activo.current = false;
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
      activo.current = true;
      setEscuchando(true);
      try {
        modulo.ExpoSpeechRecognitionModule.start({ lang: "es-PE", interimResults: true });
      } catch {
        modulo.ExpoSpeechRecognitionModule.start({ lang: "es-419", interimResults: true });
      }
    } catch {
      activo.current = false;
      setEscuchando(false);
      setTeclado(true);
    }
  };

  return { escuchando, teclado, alternar, disponible };
}