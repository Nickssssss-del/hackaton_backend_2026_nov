import AsyncStorage from "@react-native-async-storage/async-storage";
import { leerJson, guardarJson, PREFIJO } from "../almacen";
import type { ContactoEmergencia, ContactoLocal } from "../tipos";

const CLAVE = "contactos";
const MAX_CONTACTOS = 2;

function normalizar(contacto: Partial<ContactoLocal>, orden: number): ContactoLocal | null {
  const nombre = typeof contacto.nombre === "string" ? contacto.nombre.trim() : "";
  const telefono = typeof contacto.telefono === "string" ? contacto.telefono.trim() : "";
  if (!nombre || !telefono) return null;
  return {
    nombre,
    telefono,
    relacion: typeof contacto.relacion === "string" ? contacto.relacion.trim() : "",
    orden: Number.isFinite(contacto.orden) ? Number(contacto.orden) : orden,
  };
}

function limitar(contactos: ContactoLocal[]): ContactoLocal[] {
  return contactos
    .sort((a, b) => a.orden - b.orden)
    .slice(0, MAX_CONTACTOS)
    .map((contacto, indice) => ({ ...contacto, orden: indice + 1 }));
}

export async function leerContactosLocales(): Promise<ContactoLocal[]> {
  const guardados = await leerJson<ContactoLocal[]>(CLAVE, []);
  const validos = limitar(
    (Array.isArray(guardados) ? guardados : [])
      .map((contacto, indice) => normalizar(contacto, indice + 1))
      .filter((contacto): contacto is ContactoLocal => contacto !== null),
  );
  if (validos.length > 0) return validos;

  const antiguo = await leerJson<{ contactos?: ContactoEmergencia[] } | null>("emergencia", null);
  const migrados = limitar(
    (antiguo?.contactos ?? [])
      .map((contacto, indice) => normalizar({ ...contacto, relacion: "", orden: indice + 1 }, indice + 1))
      .filter((contacto): contacto is ContactoLocal => contacto !== null),
  );
  if (migrados.length > 0) {
    await guardarContactosLocales(migrados);
    await AsyncStorage.removeItem(`${PREFIJO}emergencia`);
  }
  return migrados;
}

export async function guardarContactosLocales(contactos: ContactoLocal[]): Promise<void> {
  await guardarJson(CLAVE, limitar(contactos));
}

export function contactoLocalDesdeTelefono(
  telefono: string,
  nombre = "Contacto",
  relacion = "",
): ContactoLocal {
  return { nombre: nombre.trim() || "Contacto", telefono: telefono.trim(), relacion, orden: 1 };
}
