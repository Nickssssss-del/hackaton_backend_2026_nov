/**
 * Vista. Servicios del Mockup v4 (E1–E4): sin encabezado del sistema, con la barra común.
 */
import { Stack } from "expo-router";
import { useTema } from "../../src/vistas/tema/useTema";

export default function DisenoServicios() {
  const { tema } = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.colores.fondo } }} />;
}
