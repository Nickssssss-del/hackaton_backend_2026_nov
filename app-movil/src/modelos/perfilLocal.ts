/**
 * Modelo. Perfil guardado en el teléfono.
 * No lee la tabla perfiles ni auth.users.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PerfilLocal } from "./tipos";

const CLAVE = "barrio.perfil";

export async function leerPerfilLocal(): Promise<PerfilLocal | null> {
  const crudo = await AsyncStorage.getItem(CLAVE);
  if (!crudo) return null;
  return JSON.parse(crudo) as PerfilLocal;
}

export async function guardarPerfilLocal(perfil: PerfilLocal): Promise<void> {
  await AsyncStorage.setItem(CLAVE, JSON.stringify(perfil));
}
