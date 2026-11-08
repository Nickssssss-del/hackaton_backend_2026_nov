/**
 * Vista. Mis datos (B3) y ¿Algo te pasa? (B4): sin encabezado del sistema, con la barra común.
 */
import { Stack } from "expo-router";
import { useTema } from "../../src/vistas/tema/useTema";

export default function DisenoPerfil() {
  const { tema } = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.colores.fondo } }} />;
}
