/**
 * Vista. Distribuye las pantallas. La sesión anónima arranca al abrir la app.
 */
import { SplashScreen, Stack } from "expo-router";
import { ProveedorConsulta } from "../src/controladores/ProveedorConsulta";
import { useSesion } from "../src/controladores/useSesion";
import { TemaProveedor } from "../src/vistas/tema/TemaProveedor";
import { useFonts } from "expo-font";
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from "@expo-google-fonts/atkinson-hyperlegible";
import { useEffect } from "react";

export default function DisenoRaiz() {
  useSesion();
  const [fuentesCargadas] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });

  useEffect(() => {
    if (fuentesCargadas) void SplashScreen.hideAsync();
  }, [fuentesCargadas]);

  if (!fuentesCargadas) return null;
  return (
    <TemaProveedor>
      <ProveedorConsulta>
        <Stack>
        <Stack.Screen name="index" options={{ title: "Vecinos" }} />
        <Stack.Screen name="servicio/[id]" options={{ title: "Servicio" }} />
        <Stack.Screen name="publicar" options={{ title: "Publicar servicio" }} />
        <Stack.Screen name="pedir" options={{ title: "Pedir un favor" }} />
        <Stack.Screen name="emergencia" options={{ title: "Emergencia" }} />
        <Stack.Screen name="registro" options={{ title: "Tu cuenta", headerShown: false }} />
        <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
        <Stack.Screen name="inicio" options={{ headerShown: false }} />
        <Stack.Screen name="buscar" options={{ title: "Buscar servicios" }} />
        <Stack.Screen name="mis-datos" options={{ title: "Mis datos" }} />
        </Stack>
      </ProveedorConsulta>
    </TemaProveedor>
  );
}
