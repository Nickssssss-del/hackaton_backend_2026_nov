/**
 * Modelo. Reglas puras del registro (Mockup v4). Sin dependencias nativas: se prueban con Node.
 */
import type { DireccionLocal } from "./tipos";

export const MAX_CONTACTOS = 2;
export const EDAD_MINIMA = 18;
export const EDAD_MAXIMA = 110;
export const EDAD_INICIAL = 70;

export function datosFaltantesDireccion(d: DireccionLocal): number {
  // Mockup v4: con calle y número llenos y la referencia vacía, Seguir dice «Falta 1 dato».
  // Por eso los tres campos son obligatorios para Seguir; «Omitir» sigue disponible (INC-04).
  return [d.calle, d.numero, d.referencia].filter((v) => v.trim().length === 0).length;
}

export function nombreValido(nombre: string): boolean {
  const limpio = nombre.trim();
  return limpio.length >= 2 && limpio.length <= 60;
}

/** Celular peruano de 9 dígitos que empieza en 9. Acepta espacios, guiones y el prefijo 51. */
export function normalizarCelular(texto: string): string | null {
  let digitos = texto.replace(/\D/g, "");
  if (digitos.length === 11 && digitos.startsWith("51")) digitos = digitos.slice(2);
  return /^9\d{8}$/.test(digitos) ? digitos : null;
}

const RELACIONES = /\b(mi|su)\s+(.+)$/i;

/** «Ana, mi hija» → { nombre: "Ana", relacion: "hija" }. */
export function interpretarContactoDictado(texto: string): { nombre: string; relacion: string } {
  const limpio = texto.trim().replace(/\s+/g, " ");
  const [primera, ...resto] = limpio.split(",");
  const relacionDeComa = resto.join(",").trim().replace(/^(mi|su)\s+/i, "");
  if (relacionDeComa) return { nombre: capitalizar(primera.trim()), relacion: relacionDeComa };
  const coincide = limpio.match(RELACIONES);
  if (coincide && coincide.index !== undefined) {
    return { nombre: capitalizar(limpio.slice(0, coincide.index).trim()), relacion: coincide[2].trim() };
  }
  return { nombre: capitalizar(limpio), relacion: "" };
}

function capitalizar(texto: string): string {
  return texto.replace(/(^|\s)(\p{L})/gu, (_, espacio: string, letra: string) => espacio + letra.toUpperCase());
}

