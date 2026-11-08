/**
 * Controlador. Pregunta en voz alta y ESCUCHA la respuesta (pantalla «¿Estás bien?»).
 *
 * Ciclo mientras `activo`: la app pregunta fuerte → escucha unos segundos → si no oyó nada,
 * vuelve a preguntar. No escucha mientras habla (si no, se oiría a sí misma).
 * - «estoy bien», «bien», «no pasa nada», «fue un error», «cancela», «apaga»… → `alOir("bien")`
 * - «ayuda», «auxilio», «socorro», «me caí», «no estoy bien», «llama»…        → `alOir("ayuda")`
 * Sin el módulo de voz (web, compilación antigua) o sin permiso de micrófono, solo pregunta.
 */
import { useEffect, useRef, useState } from "react";
import { decir } from "./useEscuchar";

let modulo: any = null;
try {
  modulo = require("expo-speech-recognition");
} catch {
  modulo = null;
}

export type Respuesta = "bien" | "ayuda";

/** Regla pura: qué quiso decir la persona. «no estoy bien» gana sobre «bien». */
export function interpretarRespuesta(texto: string): Respuesta | null {
  const t = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (/\b(ayuda|ayudame|ayudenme|auxilio|socorro|me cai|me caigo|me duele|no estoy bien|estoy mal|llama|ambulancia|emergencia)\b/.test(t)) return "ayuda";
  if (/\b(estoy bien|bien|no pasa nada|fue un error|me equivoque|cancela|cancelar|apaga|apagar|todo bien|tranquil[oa])\b/.test(t)) return "bien";
  return null;
}

const ESCUCHA_MS = 7000;

export function useRespuestaPorVoz(opciones: { activo: boolean; pregunta: string; alOir: (r: Respuesta) => void }) {
  const { activo, pregunta, alOir } = opciones;
  const [oyendo, setOyendo] = useState(false);
  const [oido, setOido] = useState("");
  const [sinMicrofono, setSinMicrofono] = useState(modulo === null);
  const vivo = useRef(false);
  const alOirRef = useRef(alOir);
  alOirRef.current = alOir;

  useEffect(() => {
    if (!activo) return;
    vivo.current = true;
    let corte: ReturnType<typeof setTimeout> | null = null;
    const subs: { remove: () => void }[] = [];

    const preguntarYEscuchar = () => {
      if (!vivo.current) return;
      void decir(pregunta, { fuerte: true, alTerminar: () => void escucharUnRato() });
    };

    const escucharUnRato = async () => {
      if (!vivo.current) return;
      if (!modulo) {
        corte = setTimeout(preguntarYEscuchar, 12000); // sin micrófono: solo repite la pregunta
        return;
      }
      try {
        const permiso = await modulo.ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permiso.granted) {
          setSinMicrofono(true);
          corte = setTimeout(preguntarYEscuchar, 12000);
          return;
        }
        setOyendo(true);
        modulo.ExpoSpeechRecognitionModule.start({ lang: "es-PE", interimResults: true, continuous: false });
        corte = setTimeout(() => {
          try {
            modulo.ExpoSpeechRecognitionModule.stop();
          } catch {
            // ya terminó
          }
        }, ESCUCHA_MS);
      } catch {
        setSinMicrofono(true);
        corte = setTimeout(preguntarYEscuchar, 12000);
      }
    };

    if (modulo) {
      subs.push(
        modulo.ExpoSpeechRecognitionModule.addListener("result", (e: any) => {
          const texto: string = e.results?.[0]?.transcript ?? "";
          if (!vivo.current || !texto) return;
          setOido(texto);
          const r = interpretarRespuesta(texto);
          if (r) {
            vivo.current = false;
            try {
              modulo.ExpoSpeechRecognitionModule.abort();
            } catch {
              // nada
            }
            setOyendo(false);
            alOirRef.current(r);
          }
        }),
        modulo.ExpoSpeechRecognitionModule.addListener("end", () => {
          setOyendo(false);
          if (corte) clearTimeout(corte);
          if (vivo.current) corte = setTimeout(preguntarYEscuchar, 1500);
        }),
        modulo.ExpoSpeechRecognitionModule.addListener("error", () => {
          setOyendo(false);
        }),
      );
    }

    preguntarYEscuchar();

    return () => {
      vivo.current = false;
      if (corte) clearTimeout(corte);
      subs.forEach((s) => s?.remove?.());
      try {
        modulo?.ExpoSpeechRecognitionModule.abort();
      } catch {
        // nada
      }
      setOyendo(false);
    };
  }, [activo, pregunta]);

  return { oyendo, oido, sinMicrofono };
}
