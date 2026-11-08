/**
 * Vista. Horario de pastillas (C1), Nueva pastilla (C2) y Es hora (C3): sin encabezado del sistema, con la barra común.
 */
import { Stack } from "expo-router";
import { useTema } from "../../src/vistas/tema/useTema";

export default function DisenoPastillas() {
  const { tema } = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.colores.fondo } }} />;
}
