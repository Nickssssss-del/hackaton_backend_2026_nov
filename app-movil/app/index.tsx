import { router } from "expo-router";
import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { leerJson } from "../src/modelos/almacen";
import { leerPerfilLocal } from "../src/modelos/local/perfil";

export default function Puerta() {
  const [mensaje, setMensaje] = useState("Preparando la app…");

  useEffect(() => {
    let activo = true;
    (async () => {
      const tutorialVisto = await leerJson("tutorial_visto", false);
      if (!tutorialVisto) {
        router.replace("/bienvenida/tutorial");
        return;
      }
      const permiso = await Location.getForegroundPermissionsAsync().catch(() => ({ granted: false }));
      if (!permiso.granted) {
        router.replace("/bienvenida/ubicacion");
        return;
      }
      const perfil = await leerPerfilLocal();
      const registroOmitido = await leerJson("registro_omitido", false);
      if (!perfil?.nombre && !registroOmitido) {
        router.replace("/registro/nombre");
        return;
      }
      if (activo) {
        setMensaje("Abriendo Inicio…");
        router.replace("/inicio");
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  return <>{mensaje}</>;
}
