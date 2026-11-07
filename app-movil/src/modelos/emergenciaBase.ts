/**
 * Modelo. Ficha de emergencia en JSON local.
 * Vive en el teléfono y no se envía a Supabase.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import baseIncluida from "../../assets/emergencia/base.json";
import instrucciones from "../../assets/emergencia/instrucciones.json";
import puntos from "../../assets/emergencia/puntos_seguros.json";
import type { FichaEmergencia } from "./tipos";

const CLAVE = "barrio.emergencia";

export const fichaVacia: FichaEmergencia = {
  contactos: baseIncluida.contactos,
  mensaje: baseIncluida.mensaje,
};

export const pasosEmergencia = instrucciones.pasos;
export const puntosSeguros = puntos.puntos;

export async function leerEmergencia(): Promise<FichaEmergencia> {
  const crudo = await AsyncStorage.getItem(CLAVE);
  if (!crudo) return fichaVacia;
  const guardada = JSON.parse(crudo) as Partial<FichaEmergencia>;
  return {
    contactos: Array.isArray(guardada.contactos) ? guardada.contactos : [],
    mensaje: typeof guardada.mensaje === "string" ? guardada.mensaje : "",
  };
}

export async function guardarEmergencia(ficha: FichaEmergencia): Promise<void> {
  await AsyncStorage.setItem(CLAVE, JSON.stringify(ficha));
}
