/**
 * Controlador. Al tocar la notificación de una pastilla, abre C3 (Es hora de tu pastilla).
 * En la web no hay notificaciones locales: no hace nada.
 */
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { pastillaDeRespuesta, useLastNotificationResponse } from "./recordatorios";

function EscucharRespuesta() {
  const respuesta = useLastNotificationResponse();
  const abierta = useRef<string | null>(null);
  useEffect(() => {
    const id = pastillaDeRespuesta(respuesta);
    const clave = respuesta?.notification.request.identifier ?? null;
    if (!id || !clave || abierta.current === clave) return;
    abierta.current = clave;
    router.push({ pathname: "/pastillas/aviso", params: { id } });
  }, [respuesta]);
  return null;
}

export function AbrirAvisoDePastilla() {
  return Platform.OS === "web" ? null : <EscucharRespuesta />;
}
