/**
 * Vista. Emergencia del Mockup v4: G1 ¿Estás bien?, G2 Pidiendo ayuda y G3 vista del vecino (demo).
 * Sin encabezado del sistema; al salir se calla la voz.
 */
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useTema } from "../../src/vistas/tema/useTema";

export default function DisenoEmergencia() {
  const { tema } = useTema();
  const { silenciar } = useEscuchar();
  useEffect(() => () => void silenciar(), [silenciar]);
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.colores.fondo } }} />;
}
