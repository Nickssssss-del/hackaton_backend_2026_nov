/**
 * Controlador. Voz a texto en español. Si falla el permiso o el motor, abre el teclado.
 *
 * Modo números (`{ digitos: n }`, para celulares y códigos): la gente dicta de a pedazos
 * («939… 123… 456») y Android cortaba en la primera pausa, así que solo quedaban 3 números.
 * En este modo:
 *   - se escucha de forma continua (las pausas entre pedazos no cortan);
 *   - cada pedazo se suma a lo anterior y el campo se llena mientras se habla;
 *   - lo dicho con palabras pasa a dígitos (modelos/numeroDicho.ts: «novecientos treinta y nueve» → 939);
 *   - si el motor se corta antes de tener los `n` dígitos, vuelve a escuchar solo (hasta 25 s);
 *   - al llegar a `n` dígitos deja de escuchar; como máximo escucha 25 s (o hasta tocar el micrófono).
 */
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { digitosDichos } from "../modelos/numeroDicho";

let modulo: any = null;
try {
  modulo = require("expo-speech-recognition");
} catch {
  modulo = null; // Expo Go: no hay módulo nativo
}

export type OpcionesVoz = {
  /** Modo números: cuántos dígitos se esperan (9 para un celular, 6 para un código). */
  digitos?: number;
};

const LIMITE_NUMEROS_MS = 25000;

function empezarMotor(numeros: boolean) {
  const base = numeros ? { interimResults: true, continuous: true } : { interimResults: true };
  try {
    modulo.ExpoSpeechRecognitionModule.start({ lang: "es-PE", ...base });
  } catch {
    modulo.ExpoSpeechRecognitionModule.start({ lang: "es-419", ...base });
  }
}

export function useVoz(alReconocer?: (texto: string) => void, opciones?: OpcionesVoz) {
  const [escuchando, setEscuchando] = useState(false);
  const [teclado, setTeclado] = useState(false);
  const disponible = modulo !== null;
  const digitos = opciones?.digitos;
  const numeros = digitos !== undefined;
  // El motor de voz es uno solo para toda la app: cada campo con micrófono registra sus oyentes,
  // así que solo el campo que empezó a escuchar debe recibir lo dictado (si no, se llenan todos).
  const activo = useRef(false);
  // Modo números: pedazos ya cerrados y cuándo se empezó.
  const pedazos = useRef<string[]>([]);
  const desde = useRef(0);
  const tope = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limpiarTope = () => {
    if (tope.current) clearTimeout(tope.current);
    tope.current = null;
  };
  useEffect(() => limpiarTope, []);

  useEffect(() => {
    if (!disponible) return;

    const terminar = () => {
      limpiarTope();
      activo.current = false;
      setEscuchando(false);
    };

    const suscripcionResultado = modulo.ExpoSpeechRecognitionModule.addListener("result", (evento: any) => {
      if (!activo.current) return;
      const texto: string = evento.results[0]?.transcript ?? "";

      if (!numeros) {
        if (evento.isFinal && texto.trim()) {
          terminar();
          alReconocer?.(texto.trim());
        }
        return;
      }

      // iOS entrega todo lo dicho en la sesión; Android, cada pedazo por separado.
      const anteriores = Platform.OS === "ios" ? [] : pedazos.current;
      const dicho = digitosDichos([...anteriores, texto].join(" "));
      if (evento.isFinal && texto.trim()) {
        if (Platform.OS === "ios") pedazos.current = [texto];
        else pedazos.current = [...pedazos.current, texto];
      }
      if (dicho) alReconocer?.(dicho);
      if (digitos !== undefined && dicho.length >= digitos) {
        terminar();
        try {
          modulo.ExpoSpeechRecognitionModule.stop();
        } catch {
          // ya se detuvo
        }
      }
    });

    const suscripcionError = modulo.ExpoSpeechRecognitionModule.addListener("error", (evento: any) => {
      if (!activo.current) return;
      // En modo números, «no te entendí» o silencio a mitad de dictado no es un error: se sigue.
      const codigo = String(evento?.error ?? "");
      if (numeros && (codigo === "no-speech" || codigo === "speech-timeout") && Date.now() - desde.current < LIMITE_NUMEROS_MS) return;
      terminar();
      setTeclado(true);
    });

    const suscripcionFin = modulo.ExpoSpeechRecognitionModule.addListener("end", () => {
      if (!activo.current) return;
      // Modo números: el motor se cortó por una pausa antes de tener todos los dígitos.
      const dicho = digitosDichos(pedazos.current.join(" "));
      const faltan = digitos !== undefined && dicho.length < digitos;
      if (numeros && faltan && Date.now() - desde.current < LIMITE_NUMEROS_MS) {
        try {
          empezarMotor(true);
          return;
        } catch {
          // no se pudo seguir: se termina
        }
      }
      terminar();
    });

    return () => {
      suscripcionResultado?.remove?.();
      suscripcionError?.remove?.();
      suscripcionFin?.remove?.();
    };
  }, [disponible, alReconocer, numeros, digitos]);

  const alternar = async () => {
    if (escuchando) {
      limpiarTope();
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
      pedazos.current = [];
      desde.current = Date.now();
      activo.current = true;
      setEscuchando(true);
      empezarMotor(numeros);
      if (numeros) {
        // Tope de tiempo: el modo continuo no se corta solo.
        limpiarTope();
        tope.current = setTimeout(() => {
          if (!activo.current) return;
          activo.current = false;
          setEscuchando(false);
          try {
            modulo.ExpoSpeechRecognitionModule.stop();
          } catch {
            // ya se detuvo
          }
        }, LIMITE_NUMEROS_MS);
      }
    } catch {
      activo.current = false;
      setEscuchando(false);
      setTeclado(true);
    }
  };

  return { escuchando, teclado, alternar, disponible };
}
