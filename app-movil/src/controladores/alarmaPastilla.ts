/**
 * Controlador. Alarma de la pantalla C3 «Es hora de tu pastilla»: suena y vibra en bucle mientras
 * la pantalla está abierta (como un despertador), según lo que eligió la persona en C2.
 * El aviso del sistema (notificación) suena y vibra con su canal de Android; esto es lo que
 * sigue sonando al abrir la app. Se detiene al tocar «Ya la tomé» o «Recuérdame en 10 min».
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Platform, Vibration } from "react-native";
import type { AvisoPastilla } from "../modelos/local/pastillas";

const PATRON = [0, 700, 400, 700, 1200];

let reproductor: AudioPlayer | null = null;
let repetir: ReturnType<typeof setInterval> | null = null;

export async function sonarAlarma(aviso: AvisoPastilla): Promise<void> {
  detenerAlarma();
  if (aviso.vibracion && Platform.OS !== "web") Vibration.vibrate(PATRON, true);
  if (!aviso.sonido) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    reproductor = createAudioPlayer(require("../../assets/sonidos/aviso-pastilla.wav"));
    reproductor.volume = 1;
    reproductor.play();
    // Timbre cada 5 s (deja espacio para que se oiga la voz).
    repetir = setInterval(() => {
      if (!reproductor) return;
      void reproductor.seekTo(0).then(() => reproductor?.play());
    }, 5000);
  } catch {
    reproductor = null; // compilación antigua sin expo-audio: queda la vibración y la voz.
  }
}

export function detenerAlarma(): void {
  Vibration.cancel();
  if (repetir) clearInterval(repetir);
  repetir = null;
  if (reproductor) {
    try {
      reproductor.pause();
      reproductor.remove();
    } catch {
      // ya liberado
    }
    reproductor = null;
  }
}
