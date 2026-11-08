/**
 * Controlador. Notificaciones push de la alerta vecinal (Edge Function alerta-vecinos).
 * - Registra el token de Expo con registrar_push_token cuando la persona activa
 *   «Vecinos cerca me ven si pido ayuda» (solo quien tiene la alerta activa recibe avisos).
 * - Al tocar el aviso «Un vecino necesita ayuda a X m» (data: emergencia_id, tipo "inicio"),
 *   abre G3 (/sos/alerta). Si la app está abierta cuando llega, G3 se abre sola.
 * - Aviso de cierre («Ya no hace falta», tipo "cierre"): G3 pasa al momento a «Esta emergencia ya
 *   terminó» (eventosAlerta.ts). Si se toca, abre G3 de esa emergencia, que lo muestra.
 * Requiere un development build con el projectId de EAS en app.json (extra.eas.projectId) y
 * FCM configurado (google-services.json). Sin eso no registra nada y la app sigue igual.
 */
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { registrarPushToken } from "../modelos/alertaVecinalRepositorio";
import { sincronizarPerfilLocalConNube } from "../modelos/perfilRepositorio";
import { asegurarSesionAnonima, tieneConfiguracionSupabase } from "../modelos/supabase";
import { avisarEmergenciaTerminada } from "./eventosAlerta";
import { usePreferencias } from "./PreferenciasContexto";

const CANAL_ALERTAS = "alertas-vecinos";

/** Pide permiso, obtiene el token de Expo y lo registra. Devuelve false si no se pudo (sin error visible). */
export async function registrarAvisosDeVecinos(): Promise<boolean> {
  if (Platform.OS === "web" || !tieneConfiguracionSupabase()) return false;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CANAL_ALERTAS, {
        name: "Alertas de vecinos",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 600, 300, 600],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
    const actual = await Notifications.getPermissionsAsync();
    const permiso = actual.granted ? actual : await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return false;
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("Avisos de vecinos: falta extra.eas.projectId en app.json (ejecuta eas init).");
      return false;
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await asegurarSesionAnonima();
    await sincronizarPerfilLocalConNube();
    await registrarPushToken(token, Platform.OS === "ios" ? "ios" : "android");
    return true;
  } catch (causa) {
    console.warn("Avisos de vecinos: no se pudo registrar el token.", causa);
    return false;
  }
}

type AvisoVecinal = { emergencia: string; tipo: "inicio" | "cierre" };

/** Lee el aviso de alerta vecinal (inicio o cierre); null si es otro aviso (p. ej. pastillas). */
function avisoVecinal(n: Notifications.Notification | null | undefined): AvisoVecinal | null {
  const data = n?.request.content.data as { emergencia_id?: unknown; tipo?: unknown } | undefined;
  if (typeof data?.emergencia_id !== "string") return null;
  if (data.tipo !== "inicio" && data.tipo !== "cierre") return null;
  return { emergencia: data.emergencia_id, tipo: data.tipo };
}

/** Emergencia de un aviso tocado; null si no es una alerta vecinal de inicio. */
export function emergenciaDeRespuesta(r: Notifications.NotificationResponse | null | undefined): string | null {
  const aviso = avisoVecinal(r?.notification);
  return aviso?.tipo === "inicio" ? aviso.emergencia : null;
}

function abrirAlerta(emergencia: string) {
  router.push({ pathname: "/sos/alerta", params: { emergencia } });
}

function Escuchar() {
  const { visibleParaVecinos, cargando } = usePreferencias();
  const respuesta = Notifications.useLastNotificationResponse();
  const abierta = useRef<string | null>(null);

  useEffect(() => {
    if (cargando || !visibleParaVecinos) return;
    void registrarAvisosDeVecinos();
  }, [cargando, visibleParaVecinos]);

  // Aviso tocado (con la app abierta, en segundo plano o cerrada).
  useEffect(() => {
    const aviso = avisoVecinal(respuesta?.notification);
    const clave = respuesta?.notification.request.identifier ?? null;
    if (!aviso || !clave || abierta.current === clave) return;
    abierta.current = clave;
    if (aviso.tipo === "cierre") avisarEmergenciaTerminada(aviso.emergencia);
    abrirAlerta(aviso.emergencia);
  }, [respuesta]);

  // Aviso que llega con la app abierta: la alerta se abre sola; el cierre se marca al instante.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const aviso = avisoVecinal(n);
      if (!aviso) return;
      if (aviso.tipo === "cierre") {
        avisarEmergenciaTerminada(aviso.emergencia);
        return;
      }
      abierta.current = n.request.identifier;
      abrirAlerta(aviso.emergencia);
    });
    return () => sub.remove();
  }, []);

  return null;
}

export function AvisosDeVecinos() {
  return Platform.OS === "web" ? null : <Escuchar />;
}
