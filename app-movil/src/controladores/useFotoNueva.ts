/**
 * Controlador. Elegir o tomar una foto y subirla al bucket `fotos` (E4 «Sube tu negocio» y
 * F3 «Nueva publicación»). La foto se comprime al elegirla (calidad 0,5, recorte 4:3) para no
 * pasar de 5 MB. Se sube recién al publicar, con `subir()`, y devuelve la ruta para foto_path.
 */
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { subirFoto } from "../modelos/fotosRepositorio";
import { leerPerfilLocal } from "../modelos/local/perfil";
import { mensajeDeError } from "./errores";

export interface FotoElegida {
  uri: string;
  base64: string;
  tipo: string;
}

const OPCIONES: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.5,
  base64: true,
  exif: false,
};

export function useFotoNueva() {
  const [foto, setFoto] = useState<FotoElegida | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tomar = useCallback(async (origen: "camara" | "galeria") => {
    setError(null);
    try {
      const permiso =
        origen === "camara" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        setError(origen === "camara" ? "Para tomar la foto, permite usar la cámara." : "Para elegir la foto, permite ver tus fotos.");
        return;
      }
      const r = origen === "camara" ? await ImagePicker.launchCameraAsync(OPCIONES) : await ImagePicker.launchImageLibraryAsync(OPCIONES);
      if (r.canceled || !r.assets[0]?.base64) return;
      const a = r.assets[0];
      setFoto({ uri: a.uri, base64: a.base64 ?? "", tipo: a.mimeType ?? "image/jpeg" });
    } catch {
      setError("No se pudo abrir la cámara ni tus fotos en este teléfono.");
    }
  }, []);

  /** Sube la foto elegida; devuelve la ruta o undefined si no hay foto. Lanza un Error con mensaje claro. */
  const subir = useCallback(async (): Promise<string | undefined> => {
    if (!foto) return undefined;
    const perfil = await leerPerfilLocal();
    if (!perfil?.zonaId) throw new Error("Primero marca dónde vives: Mis datos › Mi dirección.");
    try {
      return await subirFoto(foto.base64, foto.tipo, perfil.zonaId);
    } catch (causa) {
      const texto = causa instanceof Error ? causa.message : "";
      if (texto === "FOTO_MUY_GRANDE" || /exceeded|too large|413/i.test(texto)) throw new Error("La foto es muy pesada. Elige otra.");
      throw new Error(`No se pudo subir la foto. ${mensajeDeError(causa, "general")}`);
    }
  }, [foto]);

  return { foto, tomar, quitar: () => setFoto(null), subir, error };
}
