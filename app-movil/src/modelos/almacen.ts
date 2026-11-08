import AsyncStorage from "@react-native-async-storage/async-storage";

export const PREFIJO = "barrio.";

export const CLAVES_LOCALES = {
  tutorialVisto: "tutorial_visto",
  registroOmitido: "registro_omitido",
} as const;

export async function leerJson<T>(clave: string, valorPorDefecto: T): Promise<T> {
  try {
    const crudo = await AsyncStorage.getItem(`${PREFIJO}${clave}`);
    if (!crudo) return valorPorDefecto;
    const valor: unknown = JSON.parse(crudo);
    return valor as T;
  } catch {
    return valorPorDefecto;
  }
}

export async function guardarJson<T>(clave: string, valor: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIJO}${clave}`, JSON.stringify(valor));
  } catch {
    // El almacenamiento local es opcional; la app sigue funcionando sin él.
  }
}
