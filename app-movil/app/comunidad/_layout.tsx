/**
 * Vista. Comunidad (F2), Nueva publicación (F3) y detalle: sin encabezado del sistema, con la barra común.
 */
import { Stack } from "expo-router";
import { useTema } from "../../src/vistas/tema/useTema";

export default function DisenoComunidad() {
  const { tema } = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.colores.fondo } }} />;
}
