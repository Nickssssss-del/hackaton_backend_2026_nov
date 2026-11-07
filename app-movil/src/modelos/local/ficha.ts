import { leerJson, guardarJson } from "../almacen";
import type { Consentimiento, ContactoConfianza, FichaEmergencia } from "../tipos";

const DEFECTO: FichaEmergencia = { contactos: [], mensaje: "" };

export async function leerFicha(): Promise<FichaEmergencia> {
  return leerJson("ficha", DEFECTO);
}

export async function guardarFicha(ficha: FichaEmergencia): Promise<void> {
  await guardarJson("ficha", ficha);
}

export async function leerContactos(): Promise<ContactoConfianza[]> {
  const ficha = await leerFicha();
  return ficha.contactos;
}

export async function guardarConsentimiento(consentimiento: Consentimiento): Promise<void> {
  const ficha = await leerFicha();
  await guardarFicha({ ...ficha, consentimiento });
}

/** Detecta si la ficha indica "cuesta caminar" (insensible a mayúsculas). */
export function fichaCuestaCaminar(ficha: FichaEmergencia | null | undefined): boolean {
  if (!ficha?.mensaje) return false;
  return /cuesta caminar/i.test(ficha.mensaje);
}
