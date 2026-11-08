/**
 * Vista. G3 · Lo que ve un vecino cuando alguien pide ayuda (Mockup v4, p. 25).
 * Solo demostración: el equipo decidió no enviar alertas en tiempo real todavía (sin backend).
 * Mapa dibujado (sin servicios de mapas), con el punto que late y el camino punteado.
 * «Llamar 106» sí abre el marcador de verdad.
 */
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Linking, Platform, StyleSheet, View } from "react-native";
import { leerPerfil } from "../../src/controladores/registroVecinos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

// Posiciones relativas (0–1) dentro del mapa.
const TU = { x: 0.2, y: 0.85 };
const ELLA = { x: 0.52, y: 0.52 };
const VECINOS = [
  { x: 0.11, y: 0.22 },
  { x: 0.83, y: 0.22 },
  { x: 0.86, y: 0.8 },
];

export default function VecinoNecesitaAyuda() {
  const { tema } = useTema();
  const c = tema.colores;
  const [quien, setQuien] = useState("Rosa");
  const [voy, setVoy] = useState(false);
  const [ancho, setAncho] = useState(0);
  const pulso = useRef(new Animated.Value(0)).current;
  const alto = ancho * 0.78;

  useEffect(() => {
    void leerPerfil().then((p) => {
      const n = p.nombre?.trim().split(/\s+/)[0];
      if (n) setQuien(n);
    });
    const a = Animated.loop(Animated.timing(pulso, { toValue: 1, duration: 1400, useNativeDriver: Platform.OS !== "web" }));
    a.start();
    return () => a.stop();
  }, [pulso]);

  const punto = (p: { x: number; y: number }) => ({ left: p.x * ancho, top: p.y * alto });
  const puntos = Array.from({ length: 9 }, (_, k) => {
    const t = (k + 1) / 10;
    return { x: TU.x + (ELLA.x - TU.x) * t, y: TU.y + (ELLA.y - TU.y) * t };
  });

  const fondoMapa = tema.oscuro ? "#1E2A3D" : "#E6EEF9";
  const calle = tema.oscuro ? "#2A3445" : "#FBFCFE";

  return (
    <Pantalla
      textoEscuchar={`${quien} necesita ayuda, a 120 metros de ti. Dos vecinos van en camino. Toca Voy a ayudar, Llamar 106, o No puedo.`}
      pie={
        <>
          <BotonPrincipal variante="listo" icono="walk" onPress={() => setVoy(true)}>
            Voy a ayudar
          </BotonPrincipal>
          <View style={estilos.fila}>
            <View style={{ flex: 1 }}>
              <BotonPrincipal variante="secundario" onPress={() => void Linking.openURL("tel:106")}>
                Llamar 106
              </BotonPrincipal>
            </View>
            <View style={{ flex: 1 }}>
              <BotonPrincipal variante="neutro" onPress={() => router.back()}>
                No puedo
              </BotonPrincipal>
            </View>
          </View>
        </>
      }
    >
      <View style={[estilos.cabecera, { backgroundColor: c.peligro }]} accessibilityRole="header">
        <Icono nombre="alert-outline" tamano={44} color="#FFFFFF" />
        <View style={{ flex: 1 }}>
          <Texto variante="titulo" color="#FFFFFF">{`${quien} necesita ayuda`}</Texto>
          <Texto color="#FFFFFF">A 120 m de ti</Texto>
        </View>
      </View>

      <View
        onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        style={[estilos.mapa, { backgroundColor: fondoMapa, height: alto || 260 }]}
        accessibilityLabel={`Mapa: tú estás abajo a la izquierda; ${quien} está en el centro.`}
        accessible
      >
        {ancho > 0 ? (
          <>
            <View style={[estilos.calleV, { left: ancho * 0.28, backgroundColor: calle }]} />
            <View style={[estilos.calleV, { left: ancho * 0.68, backgroundColor: calle }]} />
            <View style={[estilos.calleH, { top: alto * 0.3, backgroundColor: calle }]} />
            <View style={[estilos.calleH, { top: alto * 0.67, backgroundColor: calle }]} />
            <View style={[estilos.manzana, { left: ancho * 0.38, top: alto * 0.07, width: ancho * 0.24, height: alto * 0.17, backgroundColor: "#D6E7D3" }]} />
            <View style={[estilos.manzana, { left: ancho * 0.03, top: alto * 0.42, width: ancho * 0.21, height: alto * 0.2, backgroundColor: "#F1E3C4" }]} />
            <View style={[estilos.manzana, { left: ancho * 0.77, top: alto * 0.42, width: ancho * 0.2, height: alto * 0.2, backgroundColor: "#F1E3C4" }]} />
            <View style={[estilos.manzana, { left: ancho * 0.38, top: alto * 0.78, width: ancho * 0.24, height: alto * 0.17, backgroundColor: "#D6E7D3" }]} />
            {puntos.map((p, k) => (
              <View key={k} style={[estilos.migaja, punto(p), { backgroundColor: c.accion }]} />
            ))}
            {VECINOS.map((p, k) => (
              <View key={k} style={[estilos.vecino, punto(p), { backgroundColor: c.confirmado }]} />
            ))}
            <Animated.View
              style={[
                estilos.halo,
                punto(ELLA),
                {
                  opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                  transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
                },
              ]}
            />
            <View style={[estilos.pin, punto(ELLA)]}>
              <Icono nombre="map-marker" tamano={48} color={c.peligro} />
            </View>
            <View style={[estilos.tu, punto(TU), { backgroundColor: c.accion }]} />
            <View style={[estilos.etiquetaTu, { left: TU.x * ancho - 20, top: TU.y * alto + 16 }]}>
              <Texto variante="etiqueta" color={c.accionTexto}>Tú</Texto>
            </View>
          </>
        ) : null}
      </View>

      <View style={[estilos.chip, { backgroundColor: c.confirmadoSuave }]}>
        <Texto variante="etiqueta" color={c.confirmado}>{voy ? "3 vecinos van en camino" : "2 vecinos van en camino"}</Texto>
      </View>
      <View style={[estilos.chip, { backgroundColor: c.accionSuave }]}>
        <Texto variante="etiqueta" color={c.accionTexto}>Av. Los Maestros 245</Texto>
      </View>
      {voy ? <Mensaje tono="listo">{`Le avisamos a ${quien} que vas en camino.`}</Mensaje> : null}
      <Mensaje tono="info">Demo: así verán tus vecinos un pedido de ayuda.</Mensaje>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: RADIO.l, padding: 16 },
  mapa: { borderRadius: RADIO.l, overflow: "hidden" },
  calleV: { position: "absolute", top: 0, bottom: 0, width: 18 },
  calleH: { position: "absolute", left: 0, right: 0, height: 18 },
  manzana: { position: "absolute", borderRadius: 10 },
  migaja: { position: "absolute", width: 8, height: 8, borderRadius: 4, marginLeft: -4, marginTop: -4 },
  vecino: { position: "absolute", width: 22, height: 22, borderRadius: 11, marginLeft: -11, marginTop: -11, borderWidth: 3, borderColor: "#FFFFFF" },
  halo: { position: "absolute", width: 64, height: 64, borderRadius: 32, marginLeft: -32, marginTop: -32, backgroundColor: "#D91023" },
  pin: { position: "absolute", marginLeft: -24, marginTop: -44 },
  tu: { position: "absolute", width: 26, height: 26, borderRadius: 13, marginLeft: -13, marginTop: -13, borderWidth: 3, borderColor: "#FFFFFF" },
  etiquetaTu: { position: "absolute", width: 40, alignItems: "center" },
  chip: { alignSelf: "flex-start", borderRadius: RADIO.m, paddingHorizontal: 14, paddingVertical: 8 },
  fila: { flexDirection: "row", gap: 10 },
});
