/**
 * Vista. Puerta de entrada: decide la primera pantalla.
 * - Registro del Mockup v4 sin terminar → A1 (/alta).
 * - Registro terminado → Inicio del modo elegido (sencillo → adulto mayor, completo → vecino).
 * Las pantallas del registro anterior (tutorial, ubicación, registro/…) siguen existiendo,
 * pero ya no son el camino de entrada. Se retirarán cuando el equipo lo apruebe.
 */
import { router } from "expo-router";
import { useEffect } from "react";
import { usePreferencias } from "../src/controladores/PreferenciasContexto";
import { registroCompleto, rutaInicio } from "../src/controladores/registroVecinos";

export default function Puerta() {
  const { modo } = usePreferencias();

  useEffect(() => {
    let activo = true;
    void registroCompleto().then((completo) => {
      if (!activo) return;
      router.replace(completo && modo ? rutaInicio(modo) : "/alta");
    });
    return () => {
      activo = false;
    };
  }, [modo]);

  return null;
}
