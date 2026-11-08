/**
 * Vista. Distribuye las pantallas. La sesión anónima arranca al abrir la app.
 */
import { SplashScreen, Stack } from "expo-router";
import { ProveedorConsulta } from "../src/controladores/ProveedorConsulta";
import { useSesion } from "../src/controladores/useSesion";
import { TemaProveedor } from "../src/vistas/tema/TemaProveedor";
import { PreferenciasProveedor, usePreferencias } from "../src/controladores/PreferenciasContexto";
import { useTema } from "../src/vistas/tema/useTema";
import { useFonts } from "expo-font";
import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from "@expo-google-fonts/atkinson-hyperlegible";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";
import { AbrirAvisoDePastilla } from "../src/controladores/AbrirAvisoDePastilla";
import { AvisosDeVecinos } from "../src/controladores/AvisosDeVecinos";

export default function DisenoRaiz() {
  useSesion();
  const [fuentesCargadas] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });

  if (!fuentesCargadas) return null;
  return (
    <PreferenciasProveedor>
      <TemaProveedor>
        <EsperarPreferencias>
          <ProveedorConsulta>
            <Pantallas />
          </ProveedorConsulta>
        </EsperarPreferencias>
      </TemaProveedor>
    </PreferenciasProveedor>
  );
}

/** No muestra nada hasta tener letra y tema guardados, para evitar un parpadeo claro → oscuro. */
function EsperarPreferencias({ children }: { children: ReactNode }) {
  const { cargando } = usePreferencias();
  useEffect(() => {
    if (!cargando) void SplashScreen.hideAsync();
  }, [cargando]);
  if (cargando) return null;
  return <>{children}</>;
}

function Pantallas() {
  const { tema } = useTema();
  return (
    <>
      <StatusBar style={tema.oscuro ? "light" : "dark"} />
      <AbrirAvisoDePastilla />
      <AvisosDeVecinos />
          <Stack
            screenOptions={{
              // Cada pantalla trae su barra (Volver, Aa, luna, altavoz): sin encabezado del sistema,
              // así no aparecen dos «Volver».
              headerShown: false,
              contentStyle: { backgroundColor: tema.colores.fondo },
              headerStyle: { backgroundColor: tema.colores.superficie },
              headerTintColor: tema.colores.texto,
            }}
          >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="alta" options={{ headerShown: false }} />
          <Stack.Screen name="principal" options={{ headerShown: false }} />
          <Stack.Screen name="perfil" options={{ headerShown: false }} />
          <Stack.Screen name="pronto" options={{ headerShown: false }} />
          <Stack.Screen name="pastillas" options={{ headerShown: false }} />
          <Stack.Screen name="ayuda-vecinos" options={{ headerShown: false }} />
          <Stack.Screen name="servicios" options={{ headerShown: false }} />
          <Stack.Screen name="comunidad" options={{ headerShown: false }} />
          <Stack.Screen name="preguntale" options={{ headerShown: false }} />
          <Stack.Screen name="sos" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="servicio/[id]" options={{ title: "Servicio" }} />
          <Stack.Screen name="publicar" options={{ title: "Publicar servicio" }} />
          <Stack.Screen name="publicar/detalles" options={{ title: "Detalles del servicio" }} />
          <Stack.Screen name="ayuda" options={{ title: "Ayuda entre vecinos" }} />
          <Stack.Screen name="ayuda/pedir" options={{ title: "Pedir un favor" }} />
          <Stack.Screen name="ayuda/mis-pedidos" options={{ title: "Mis pedidos" }} />
          <Stack.Screen name="mis-servicios" options={{ title: "Mis servicios" }} />
          <Stack.Screen name="emergencia" options={{ title: "Emergencia" }} />
          <Stack.Screen name="registro" options={{ title: "Tu cuenta", headerShown: false }} />
          <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
          <Stack.Screen name="inicio" options={{ headerShown: false }} />
          <Stack.Screen name="buscar" options={{ title: "Buscar servicios" }} />
          <Stack.Screen name="mis-datos" options={{ title: "Mis datos" }} />
          <Stack.Screen name="dev/catalogo" options={{ headerShown: false }} />
          </Stack>
    </>
  );
}
