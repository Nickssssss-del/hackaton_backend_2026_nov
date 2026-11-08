/**
 * Vista. Flujo de registro del Mockup v4 (A1–A6) + paso 4 «¿Algo de esto te pasa?». Sin encabezado del sistema:
 * cada pantalla usa la barra superior común (Volver, Aa, luna, Escuchar).
 */
import { Stack } from "expo-router";
import { useTema } from "../../src/vistas/tema/useTema";

export default function DisenoAlta() {
  const { tema } = useTema();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.colores.fondo } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="modo" />
      <Stack.Screen name="ubicacion" />
      <Stack.Screen name="direccion" />
      <Stack.Screen name="zona" />
      <Stack.Screen name="datos" />
      <Stack.Screen name="contactos" />
      <Stack.Screen name="situaciones" />
      {/* A6: sin regreso al registro (gesto atrás desactivado). */}
      <Stack.Screen name="listo" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
