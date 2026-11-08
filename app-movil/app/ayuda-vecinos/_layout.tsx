/**
 * Vista. Ayuda entre vecinos (F1) y Pedir ayuda (F1.1): sin encabezado del sistema, con la barra común.
 */
import { Stack } from "expo-router";
import { useTema } from "../../src/vistas/tema/useTema";

export default function DisenoAyudaVecinos() {
  const { tema } = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.colores.fondo } }} />;
}
