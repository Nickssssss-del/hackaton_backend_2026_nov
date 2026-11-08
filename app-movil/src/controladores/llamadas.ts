/**
 * Controlador. Llamadas de la emergencia.
 *
 * - Android + permiso CALL_PHONE: llama DIRECTO a contactos y al comité vecinal (sin que la
 *   persona toque nada), con el intent android.intent.action.CALL.
 * - Números de emergencia (105, 116, 106 y otros cortos): Android no deja que una app los llame
 *   sola; se abre el marcador con el número listo y la persona solo toca el botón verde.
 * - Sin permiso, en iPhone o en la web: se abre el marcador.
 */
import { Linking, PermissionsAndroid, Platform } from "react-native";

let lanzador: { startActivityAsync: (accion: string, params?: { data?: string }) => Promise<unknown> } | null = null;
try {
  lanzador = require("expo-intent-launcher");
} catch {
  lanzador = null; // compilación antigua sin el módulo nativo
}

export type ResultadoLlamada = "llamando" | "marcador" | "error";

const limpiar = (numero: string) => numero.replace(/[^\d+]/g, "");

/** 105, 116, 106 y demás números cortos: Android los bloquea para llamada directa. */
export function esNumeroDeEmergencia(numero: string): boolean {
  return limpiar(numero).length <= 4;
}

/** Solo mira si ya hay permiso, sin preguntar (para no frenar la llamada en plena emergencia). */
export async function tienePermisoLlamar(): Promise<boolean> {
  if (Platform.OS !== "android" || !lanzador) return false;
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
  } catch {
    return false;
  }
}

/** Abre los Ajustes de la app para que la persona active «Teléfono» si antes dijo «Ahora no». */
export function abrirAjustesDeLaApp(): void {
  void Linking.openSettings().catch(() => undefined);
}

/** Pregunta el permiso (se usa en G1 «¿Estás bien?», ANTES de que haga falta llamar). */
export async function permisoLlamarDirecto(): Promise<boolean> {
  if (Platform.OS !== "android" || !lanzador) return false;
  try {
    const ya = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
    if (ya) return true;
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE, {
      title: "Llamar en una emergencia",
      message: "Para llamar sola a tus contactos si no puedes tocar el teléfono.",
      buttonPositive: "Permitir",
      buttonNegative: "Ahora no",
    });
    return r === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export async function llamar(numero: string): Promise<ResultadoLlamada> {
  const tel = `tel:${limpiar(numero)}`;
  // Solo se mira el permiso: si la persona dijo «Ahora no», va directo al marcador sin preguntar otra vez.
  if (!esNumeroDeEmergencia(numero) && lanzador && (await tienePermisoLlamar())) {
    try {
      // No se espera: la promesa recién se resuelve cuando la persona vuelve a la app.
      void lanzador.startActivityAsync("android.intent.action.CALL", { data: tel }).catch(() => undefined);
      return "llamando";
    } catch {
      // sigue al marcador
    }
  }
  try {
    await Linking.openURL(tel);
    return "marcador";
  } catch {
    return "error";
  }
}
