/**
 * Controlador. «Emergencia o caída» (Mockup v4, p. 26: «Botón Emergencia o caída → ¿Estás bien?»).
 *
 * Con el acelerómetro (expo-sensors) busca el patrón típico de una caída:
 *   1. caída libre: la aceleración total baja de 0,6 g durante 100 ms o más;
 *   2. golpe: antes de 1 s supera 1,6 g (una cama frena suave; el piso, fuerte);
 *   3. quietud: en los 1,5 s siguientes casi no se mueve (cerca de 1 g).
 * Umbrales y pruebas en modelos/detectorCaida.ts.
 * Si se cumple, abre G1 (/sos?caida=1): la persona tiene la cuenta para decir «Estoy bien».
 *
 * Funciona con la app abierta (Android no deja leer el acelerómetro con la app cerrada sin un
 * servicio en primer plano). No corre durante el registro ni dentro de la emergencia, y espera
 * 1 minuto entre detecciones. Se apaga en Mis datos › «Detectar caídas».
 */
import { router, usePathname } from "expo-router";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { crearDetector } from "../modelos/detectorCaida";
import { usePreferencias } from "./PreferenciasContexto";

// 50 lecturas por segundo: un golpe sobre una cama dura 30-60 ms y con 20 por segundo se perdía.
const INTERVALO_MS = 20;
const ESPERA_ENTRE_DETECCIONES_MS = 60000;

function Escuchar() {
  const { detectarCaidas, cargando, modo } = usePreferencias();
  const ruta = usePathname();
  const rutaRef = useRef(ruta);
  rutaRef.current = ruta;
  const ultima = useRef(0);

  useEffect(() => {
    // Solo con el registro terminado (modo elegido) y el interruptor en Sí.
    if (cargando || !detectarCaidas || !modo) return;
    let suscripcion: { remove: () => void } | null = null;
    let detector = crearDetector();

    const empezar = async () => {
      try {
        if (!(await Accelerometer.isAvailableAsync())) return;
        Accelerometer.setUpdateInterval(INTERVALO_MS);
        detector = crearDetector();
        suscripcion = Accelerometer.addListener(({ x, y, z }) => {
          const g = Math.sqrt(x * x + y * y + z * z);
          if (!detector(g, Date.now())) return;
          const r = rutaRef.current ?? "";
          if (r.startsWith("/sos") || r.startsWith("/emergencia") || r.startsWith("/alta")) return;
          if (Date.now() - ultima.current < ESPERA_ENTRE_DETECCIONES_MS) return;
          ultima.current = Date.now();
          router.push({ pathname: "/sos", params: { caida: "1" } });
        });
      } catch {
        // Sin acelerómetro: el botón Emergencia sigue funcionando igual.
      }
    };
    const parar = () => {
      suscripcion?.remove();
      suscripcion = null;
    };

    if (AppState.currentState === "active") void empezar();
    const cambio = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        if (!suscripcion) void empezar();
      } else parar();
    });
    return () => {
      cambio.remove();
      parar();
    };
  }, [cargando, detectarCaidas, modo]);

  return null;
}

export function DetectorDeCaidas() {
  return Platform.OS === "web" ? null : <Escuchar />;
}
