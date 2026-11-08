/**
 * Vista. Mapa de OpenStreetMap con puntos (G3 alerta vecinal, Mockup v4 p. 25).
 * - Teselas de tile.openstreetmap.org (con User-Agent propio, como pide su política) y la
 *   atribución «© OpenStreetMap». Sin librería nativa de mapas ni clave.
 * - Puntos: «Tú» (azul), la persona que pide ayuda (rojo, late) y otros puntos opcionales.
 * - Línea punteada de «Tú» a la persona, y un anillo opcional con la distancia aproximada
 *   (antes de «Voy a ayudar» la base no entrega la ubicación exacta).
 * - Sin internet o si las teselas no cargan: el mapa dibujado de la demo (calles y manzanas).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Platform, StyleSheet, View } from "react-native";
import { aPixel, metrosPorPixel, teselasVisibles, zoomParaVer, type Coordenada } from "../../modelos/mapaOSM";
import { RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Texto } from "./Texto";

const CABECERAS = { "User-Agent": "Vecinos/1.0 (app comunitaria, Hackaton UTP 2026)" };

export interface PuntoMapa extends Coordenada {
  tipo: "yo" | "ayuda" | "vecino";
  etiqueta?: string;
}

type Props = {
  puntos: PuntoMapa[];
  /** Anillo alrededor de «yo» con este radio en metros (distancia aproximada). */
  anilloM?: number;
  descripcion: string;
};

export function MapaOSM({ puntos, anilloM, descripcion }: Props) {
  const { tema } = useTema();
  const [ancho, setAncho] = useState(0);
  const [fallos, setFallos] = useState(0);
  const pulso = useRef(new Animated.Value(0)).current;
  const alto = Math.round(ancho * 0.78);

  useEffect(() => {
    const a = Animated.loop(Animated.timing(pulso, { toValue: 1, duration: 1400, useNativeDriver: Platform.OS !== "web" }));
    a.start();
    return () => a.stop();
  }, [pulso]);

  const vista = useMemo(() => {
    if (!ancho || puntos.length === 0) return null;
    const z = zoomParaVer(puntos, anilloM ?? 0, ancho, alto);
    const px = puntos.map((p) => aPixel(p, z));
    const centro = {
      x: (Math.min(...px.map((p) => p.x)) + Math.max(...px.map((p) => p.x))) / 2,
      y: (Math.min(...px.map((p) => p.y)) + Math.max(...px.map((p) => p.y))) / 2,
    };
    const local = (p: { x: number; y: number }) => ({ left: p.x - centro.x + ancho / 2, top: p.y - centro.y + alto / 2 });
    return {
      teselas: teselasVisibles(centro, z, ancho, alto),
      marcas: puntos.map((p, k) => ({ ...p, ...local(px[k]) })),
      anilloPx: anilloM ? anilloM / metrosPorPixel(puntos[0].lat, z) : 0,
    };
  }, [ancho, alto, puntos, anilloM]);

  const sinTeselas = vista ? fallos >= Math.max(1, Math.ceil(vista.teselas.length / 2)) : false;
  const yo = vista?.marcas.find((m) => m.tipo === "yo");
  const ayuda = vista?.marcas.find((m) => m.tipo === "ayuda");
  const camino =
    yo && ayuda
      ? Array.from({ length: 11 }, (_, k) => {
          const t = (k + 1) / 12;
          return { left: yo.left + (ayuda.left - yo.left) * t, top: yo.top + (ayuda.top - yo.top) * t };
        })
      : [];

  return (
    <View
      onLayout={(e) => setAncho(Math.round(e.nativeEvent.layout.width))}
      style={[estilos.marco, { height: alto || 260, backgroundColor: tema.oscuro ? "#1E2A3D" : "#E6EEF9" }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={descripcion}
    >
      {vista && sinTeselas ? <FondoDibujado oscuro={tema.oscuro} /> : null}
      {vista && !sinTeselas
        ? vista.teselas.map((t) => (
            <Image
              key={t.clave}
              source={{ uri: t.url, headers: CABECERAS }}
              onError={() => setFallos((f) => f + 1)}
              style={[estilos.tesela, { left: t.izquierda, top: t.arriba }]}
            />
          ))
        : null}

      {yo && vista && vista.anilloPx > 8 ? (
        <View
          pointerEvents="none"
          style={[
            estilos.anillo,
            {
              left: yo.left - vista.anilloPx,
              top: yo.top - vista.anilloPx,
              width: vista.anilloPx * 2,
              height: vista.anilloPx * 2,
              borderRadius: vista.anilloPx,
              borderColor: tema.colores.peligro,
            },
          ]}
        />
      ) : null}

      {camino.map((p, k) => (
        <View key={k} style={[estilos.puntito, { left: p.left - 3, top: p.top - 3, backgroundColor: "#1F4E9C" }]} />
      ))}

      {vista?.marcas.map((m, k) =>
        m.tipo === "ayuda" ? (
          <View key={k} style={[estilos.marca, { left: m.left - 22, top: m.top - 22 }]} pointerEvents="none">
            <Animated.View
              style={[
                estilos.halo,
                {
                  backgroundColor: tema.colores.peligro,
                  opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                  transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
                },
              ]}
            />
            <View style={[estilos.punto, { backgroundColor: tema.colores.peligro }]} />
          </View>
        ) : (
          <View key={k} style={[estilos.marcaChica, { left: m.left - 11, top: m.top - 11 }]} pointerEvents="none">
            <View style={[estilos.puntoChico, { backgroundColor: m.tipo === "yo" ? "#1F4E9C" : "#186B3A" }]} />
            {m.tipo === "yo" ? (
              <Texto variante="etiqueta" style={estilos.etiquetaTu} color="#1F4E9C">
                {m.etiqueta ?? "Tú"}
              </Texto>
            ) : null}
          </View>
        ),
      )}

      {vista && !sinTeselas ? (
        <View style={estilos.atribucion} pointerEvents="none">
          <Texto variante="ayuda" style={estilos.atribucionTexto}>© OpenStreetMap</Texto>
        </View>
      ) : null}
    </View>
  );
}

/** Mapa dibujado, el mismo estilo de la demo, cuando no hay teselas. */
function FondoDibujado({ oscuro }: { oscuro: boolean }) {
  const calle = oscuro ? "#2A3445" : "#FBFCFE";
  const manzana = oscuro ? "#24304A" : "#D7E8D0";
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[estilos.calleH, { top: "30%", backgroundColor: calle }]} />
      <View style={[estilos.calleH, { top: "66%", backgroundColor: calle }]} />
      <View style={[estilos.calleV, { left: "28%", backgroundColor: calle }]} />
      <View style={[estilos.calleV, { left: "68%", backgroundColor: calle }]} />
      <View style={[estilos.manzana, { left: "38%", top: "8%", backgroundColor: manzana }]} />
      <View style={[estilos.manzana, { left: "38%", top: "76%", backgroundColor: manzana }]} />
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: { width: "100%", borderRadius: RADIO.l, overflow: "hidden" },
  tesela: { position: "absolute", width: 256, height: 256 },
  anillo: { position: "absolute", borderWidth: 2, borderStyle: "dashed" },
  puntito: { position: "absolute", width: 6, height: 6, borderRadius: 3 },
  marca: { position: "absolute", width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 44, height: 44, borderRadius: 22 },
  punto: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: "#FFFFFF" },
  marcaChica: { position: "absolute", width: 22, height: 22, alignItems: "center" },
  puntoChico: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: "#FFFFFF" },
  etiquetaTu: { marginTop: 2, width: 60, textAlign: "center", textShadowColor: "#FFFFFF", textShadowRadius: 4 },
  atribucion: { position: "absolute", right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.85)", paddingHorizontal: 6, borderTopLeftRadius: 8 },
  atribucionTexto: { fontSize: 18, color: "#333333" },
  calleH: { position: "absolute", left: 0, right: 0, height: 22 },
  calleV: { position: "absolute", top: 0, bottom: 0, width: 22 },
  manzana: { position: "absolute", width: "22%", height: "16%", borderRadius: 8 },
});
