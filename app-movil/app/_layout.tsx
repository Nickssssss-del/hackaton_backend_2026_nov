/**
 * Vista. Distribuye las pantallas. La sesión anónima arranca al abrir la app.
 */
import { Stack } from "expo-router";
import { ProveedorConsulta } from "../src/controladores/ProveedorConsulta";
import { useRegistro } from "../src/controladores/useRegistro";

export default function DisenoRaiz() {
  useRegistro();

  return (
    <ProveedorConsulta>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Vecinos" }} />
        <Stack.Screen name="servicio/[id]" options={{ title: "Servicio" }} />
        <Stack.Screen name="publicar" options={{ title: "Publicar servicio" }} />
        <Stack.Screen name="pedir" options={{ title: "Pedir un favor" }} />
        <Stack.Screen name="emergencia" options={{ title: "Emergencia" }} />
        <Stack.Screen name="registro" options={{ title: "Tu cuenta" }} />
        <Stack.Screen name="mis-datos" options={{ title: "Mis datos" }} />
      </Stack>
    </ProveedorConsulta>
  );
}
