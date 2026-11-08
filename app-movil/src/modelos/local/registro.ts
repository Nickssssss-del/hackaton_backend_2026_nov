/**
 * Modelo. Estado del registro del Mockup v4 (A1–A6), solo en el teléfono.
 */
import { guardarJson, leerJson } from "../almacen";

const CLAVE = "registro_v4";

export interface EstadoRegistro {
  /** true al tocar «Entrar» en A6. */
  completo: boolean;
  /** true si la persona tocó «Omitir» en A3.1. */
  direccionOmitida?: boolean;
  completadoEn?: string;
}

export function leerEstadoRegistro(): Promise<EstadoRegistro> {
  return leerJson<EstadoRegistro>(CLAVE, { completo: false });
}

export async function guardarEstadoRegistro(cambios: Partial<EstadoRegistro>): Promise<void> {
  const actual = await leerEstadoRegistro();
  await guardarJson(CLAVE, { ...actual, ...cambios });
}
