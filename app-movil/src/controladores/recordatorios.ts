/**
 * Controlador. Recordatorios de pastillas con notificaciones LOCALES (expo-notifications):
 * suenan sin internet y no pasan por Supabase (Mockup v4, matriz C).
 * - Un aviso diario por pastilla, a su hora (INC-21: repetición diaria).
 * - «Recuérdame en 10 min»: un aviso único 10 minutos después.
 * - Sonido y vibración se eligen con el canal de Android; la voz la pone la app al abrir C3.
 * - Hora «mejor esfuerzo» de Android (puede retrasarse unos minutos con ahorro de batería;
 *   las alarmas exactas exigirían el permiso SCHEDULE_EXACT_ALARM: INC-34).
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  cantidadLegible,
  guardarPastillas,
  horaLegible,
  leerPastillas,
  type AvisoPastilla,
  type Pastilla,
} from "../modelos/local/pastillas";

const disponible = Platform.OS !== "web";

if (disponible) Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// «v2»: Android no deja cambiar un canal ya creado; con nombre nuevo se aplican sonido y vibración
// a quienes instalaron una versión anterior.
function canalPara(aviso: AvisoPastilla): string {
  return `pastillas-v2-${aviso.sonido ? "s" : "x"}${aviso.vibracion ? "v" : "x"}`;
}

async function asegurarCanales(): Promise<void> {
  if (Platform.OS !== "android") return;
  for (const sonido of [true, false]) {
    for (const vibracion of [true, false]) {
      const id = canalPara({ sonido, vibracion, voz: false });
      await Notifications.setNotificationChannelAsync(id, {
        name: `Pastillas${sonido ? " · sonido" : ""}${vibracion ? " · vibración" : ""}`,
        importance: Notifications.AndroidImportance.MAX,
        sound: sonido ? "default" : null,
        enableVibrate: vibracion,
        vibrationPattern: vibracion ? [0, 800, 400, 800, 400, 800] : [0],
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
  }
}

export type PermisoAvisos = "concedido" | "denegado" | "no_disponible";

/** Pide permiso de notificaciones (Android 13+ lo exige) y crea los canales. */
export async function prepararAvisos(): Promise<PermisoAvisos> {
  if (!disponible) return "no_disponible";
  try {
    await asegurarCanales();
    const actual = await Notifications.getPermissionsAsync();
    const final = actual.granted ? actual : await Notifications.requestPermissionsAsync();
    return final.granted ? "concedido" : "denegado";
  } catch {
    return "no_disponible";
  }
}

function contenido(p: Pastilla): Notifications.NotificationContentInput {
  return {
    title: "Es hora de tu pastilla",
    body: `${horaLegible(p.hora)} · ${p.nombre} · Toma ${cantidadLegible(p.cantidad)}`,
    data: { tipo: "pastilla", pastillaId: p.id },
    sound: p.aviso.sonido ? "default" : undefined,
  };
}

async function programarDiario(p: Pastilla): Promise<string | undefined> {
  if (!disponible) return undefined;
  const [hour, minute] = p.hora.split(":").map(Number);
  return Notifications.scheduleNotificationAsync({
    content: contenido(p),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: canalPara(p.aviso) },
  });
}

async function cancelar(id?: string): Promise<void> {
  if (!disponible || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Ya no existía.
  }
}

/** Guarda una pastilla nueva o editada y (re)programa su aviso diario. */
export async function guardarPastillaConAviso(p: Pastilla): Promise<void> {
  const lista = await leerPastillas();
  const anterior = lista.find((x) => x.id === p.id);
  await cancelar(anterior?.notificacionId);
  let notificacionId: string | undefined;
  try {
    notificacionId = await programarDiario(p);
  } catch {
    notificacionId = undefined;
  }
  await guardarPastillas([...lista.filter((x) => x.id !== p.id), { ...p, notificacionId }]);
}

/** Aviso de prueba en 10 segundos, para comprobar que suena y vibra (también con la app cerrada). */
export async function probarAvisoEnDiezSegundos(p: Pastilla): Promise<PermisoAvisos> {
  const permiso = await prepararAvisos();
  if (permiso !== "concedido") return permiso;
  await Notifications.scheduleNotificationAsync({
    content: contenido(p),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: canalPara(p.aviso) },
  });
  return "concedido";
}

/** Al llegar un aviso con la app abierta: id de la pastilla (para abrir C3 enseguida). */
export function escucharAvisosConAppAbierta(alLlegar: (pastillaId: string) => void): () => void {
  if (!disponible) return () => undefined;
  const sub = Notifications.addNotificationReceivedListener((n) => {
    const data = n.request.content.data as { tipo?: string; pastillaId?: string } | undefined;
    if (data?.tipo === "pastilla" && data.pastillaId) alLlegar(data.pastillaId);
  });
  return () => sub.remove();
}

export async function cancelarTodosLosAvisos(): Promise<void> {
  if (!disponible) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // nada programado
  }
}

export async function quitarPastilla(id: string): Promise<void> {
  const lista = await leerPastillas();
  await cancelar(lista.find((x) => x.id === id)?.notificacionId);
  await guardarPastillas(lista.filter((x) => x.id !== id));
}

/** «Recuérdame en 10 min». */
export async function posponerDiezMinutos(p: Pastilla): Promise<boolean> {
  if (!disponible) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: contenido(p),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 600,
        channelId: canalPara(p.aviso),
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Id de la pastilla de una notificación tocada (para abrir C3). */
export function pastillaDeRespuesta(r: Notifications.NotificationResponse | null | undefined): string | null {
  const data = r?.notification.request.content.data as { tipo?: string; pastillaId?: string } | undefined;
  return data?.tipo === "pastilla" && data.pastillaId ? data.pastillaId : null;
}

export { useLastNotificationResponse } from "expo-notifications";
