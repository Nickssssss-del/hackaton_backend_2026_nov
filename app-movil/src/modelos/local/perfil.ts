/**
 * Modelo. Perfil guardado en el teléfono.
 * No lee perfiles ajenos ni tablas internas.
 */
import { leerJson, guardarJson } from "../almacen";
import type { PerfilLocal } from "../tipos";

export async function leerPerfilLocal(): Promise<PerfilLocal | null> {
  return leerJson<PerfilLocal | null>("perfil", null);
}

export async function guardarPerfilLocal(perfil: PerfilLocal): Promise<void> {
  await guardarJson("perfil", perfil);
}
