/**
 * Controlador. «Avisarles cuando salgo de casa» (A5 y B3, Mockup v4; INC-07, decisión D-07).
 *
 * - Una geocerca de 150 m alrededor de la casa (coordenadas exactas del registro, solo en el
 *   teléfono) con expo-location + expo-task-manager. Necesita permiso de ubicación «Todo el tiempo».
 * - Al salir, una notificación local: «Saliste de casa. ¿Avisamos a tus contactos?».
 *   Al tocarla se abre /salida, que prepara el SMS a las personas de confianza. La persona toca
 *   Enviar: Android no deja mandar SMS solo y la app nunca dice «enviado» si no lo confirmó.
 * - Como máximo un aviso cada 30 minutos (el GPS puede salir y entrar varias veces).
 * - Nada sale del teléfono: ni la casa ni la geocerca van a Supabase.
 */
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import * as TaskManager from "expo-task-manager";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { guardarJson, leerJson } from "../modelos/almacen";
import { leerPerfilLocal } from "../modelos/local/perfil";
import { usePreferencias } from "./PreferenciasContexto";

export const TAREA_SALIDA = "barrio-salida-de-casa";
const RADIO_CASA_M = 150;
const ESPERA_ENTRE_AVISOS_MS = 30 * 60 * 1000;
const CANAL_SALIDA = "salida-de-casa";
const disponible = Platform.OS !== "web";

// La tarea se define al cargar el módulo (lo exige expo-task-manager), también con la app cerrada.
if (disponible) {
  TaskManager.defineTask(TAREA_SALIDA, async ({ data, error }) => {
    if (error) return;
    const { eventType } = (data ?? {}) as { eventType?: Location.GeofencingEventType };
    if (eventType !== Location.GeofencingEventType.Exit) return;
    const ultimo = await leerJson<number>("salida_ultimo_aviso", 0);
    if (Date.now() - ultimo < ESPERA_ENTRE_AVISOS_MS) return;
    await guardarJson("salida_ultimo_aviso", Date.now());
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Saliste de casa",
        body: "¿Avisamos a tus personas de confianza? Toca aquí.",
        data: { tipo: "salida" },
        sound: "default",
      },
      trigger: Platform.OS === "android" ? { channelId: CANAL_SALIDA } : null,
    });
  });
}

export type ResultadoSalida = "activo" | "sin_permiso" | "sin_casa" | "no_disponible";

/**
 * Activa la geocerca. Con `pedirPermiso` pide la ubicación «Todo el tiempo» (solo cuando la persona
 * acaba de activar el interruptor); sin él, solo la reactiva si el permiso ya estaba dado.
 */
export async function activarAvisoSalida(pedirPermiso: boolean): Promise<ResultadoSalida> {
  if (!disponible) return "no_disponible";
  try {
    const perfil = await leerPerfilLocal();
    if (typeof perfil?.lat !== "number" || typeof perfil?.lng !== "number") return "sin_casa";

    let primerPlano = await Location.getForegroundPermissionsAsync();
    if (!primerPlano.granted && pedirPermiso) primerPlano = await Location.requestForegroundPermissionsAsync();
    if (!primerPlano.granted) return "sin_permiso";
    let fondo = await Location.getBackgroundPermissionsAsync();
    if (!fondo.granted && pedirPermiso) fondo = await Location.requestBackgroundPermissionsAsync();
    if (!fondo.granted) return "sin_permiso";

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CANAL_SALIDA, {
        name: "Aviso al salir de casa",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    }
    if (pedirPermiso) await Notifications.requestPermissionsAsync();

    await Location.startGeofencingAsync(TAREA_SALIDA, [
      {
        identifier: "casa",
        latitude: perfil.lat,
        longitude: perfil.lng,
        radius: RADIO_CASA_M,
        notifyOnEnter: false,
        notifyOnExit: true,
      },
    ]);
    return "activo";
  } catch {
    return "no_disponible";
  }
}

export async function desactivarAvisoSalida(): Promise<void> {
  if (!disponible) return;
  try {
    if (await TaskManager.isTaskRegisteredAsync(TAREA_SALIDA)) await Location.stopGeofencingAsync(TAREA_SALIDA);
  } catch {
    // Si no estaba activa, no hay nada que hacer.
  }
}

/** Mensaje claro para la persona según el resultado; null si quedó activo. */
export function mensajeSalida(r: ResultadoSalida): string | null {
  switch (r) {
    case "activo":
      return null;
    case "sin_casa":
      return "Primero marca dónde vives en Mi dirección, con «Usar mi ubicación».";
    case "sin_permiso":
      return "Para avisar cuando sales, permite la ubicación «Todo el tiempo» en los ajustes del teléfono.";
    default:
      return "Este teléfono no puede avisar cuando sales de casa.";
  }
}

/**
 * Montado en la raíz: con el interruptor en Sí reactiva la geocerca (sin pedir permisos) y con No
 * la apaga. Al tocar la notificación «Saliste de casa» abre /salida.
 */
function Sincronizar() {
  const { avisarAlSalir, cargando } = usePreferencias();
  const respuesta = Notifications.useLastNotificationResponse();
  const abierta = useRef<string | null>(null);

  useEffect(() => {
    if (cargando) return;
    if (avisarAlSalir) void activarAvisoSalida(false);
    else void desactivarAvisoSalida();
  }, [avisarAlSalir, cargando]);

  useEffect(() => {
    const data = respuesta?.notification.request.content.data as { tipo?: unknown } | undefined;
    const clave = respuesta?.notification.request.identifier ?? null;
    if (data?.tipo !== "salida" || !clave || abierta.current === clave) return;
    abierta.current = clave;
    router.push("/salida");
  }, [respuesta]);

  return null;
}

export function AvisoSalidaDeCasa() {
  return disponible ? <Sincronizar /> : null;
}

/**
 * Abre Mensajes con «Salí de casa a las HH:MM» y la ubicación actual (si se consigue en 8 s) para
 * las personas de confianza. Devuelve a quiénes se preparó o un motivo si no se pudo.
 */
export async function prepararMensajeSalida(): Promise<{ nombres: string[] } | { problema: string }> {
  const SMS = await import("expo-sms");
  const { leerContactosLocales } = await import("../modelos/local/contactos");
  const contactos = await leerContactosLocales();
  if (contactos.length === 0) return { problema: "Aún no tienes personas de confianza. Agrégalas en Mis datos › Mis contactos." };
  if (!(await SMS.isAvailableAsync())) return { problema: "Este teléfono no puede enviar mensajes." };
  let ubicacion = "";
  try {
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({}),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    if (pos) ubicacion = ` Estoy aquí: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
  } catch {
    // sin ubicación, el mensaje sale igual
  }
  const perfil = await leerPerfilLocal();
  const ahora = new Date();
  const hora = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  const nombre = perfil?.nombre?.trim() ? `Soy ${perfil.nombre.trim()}. ` : "";
  await SMS.sendSMSAsync(
    contactos.map((c) => c.telefono),
    `${nombre}Salí de casa a las ${hora}. Te aviso por si acaso.${ubicacion}`,
  );
  return { nombres: contactos.map((c) => c.nombre) };
}
