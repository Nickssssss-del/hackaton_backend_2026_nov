/**
 * Modelo. Ficha de emergencia en JSON local.
 * Vive en el teléfono y no se envía a Supabase.
 */
import baseIncluida from "../../../assets/emergencia/base.json";
import instrucciones from "../../../assets/emergencia/instrucciones.json";
import puntos from "../../../assets/emergencia/puntos_seguros.json";
import { leerJson, guardarJson } from "../almacen";
import type { FichaEmergencia } from "../tipos";

export const fichaVacia: FichaEmergencia = {
  contactos: baseIncluida.contactos,
  mensaje: baseIncluida.mensaje,
};

export const pasosEmergencia = instrucciones.pasos;
export const puntosSeguros = puntos.puntos;

export async function leerEmergencia(): Promise<FichaEmergencia> {
  return leerJson("emergencia", fichaVacia);
}

export async function guardarEmergencia(ficha: FichaEmergencia): Promise<void> {
  await guardarJson("emergencia", ficha);
}
