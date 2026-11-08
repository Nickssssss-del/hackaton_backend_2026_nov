/**
 * Vista. Mapa de OpenStreetMap con puntos (G3 alerta vecinal, Mockup v4 p. 25).
 * - Teselas de Esri (sin clave); si no cargan en 8 s o fallan, OpenStreetMap y luego CARTO
 *   (modelos/mapaOSM.ts). Siempre con su atribución. Sin librería nativa de mapas ni clave.
 * - Puntos: «Tú» (azul), la persona que pide ayuda (rojo, late) y otros puntos opcionales.
 * - Línea punteada de «Tú» a la persona, y un anillo opcional con la distancia aproximada
 *   (antes de «Voy a ayudar» la base no entrega la ubicación exacta).
 * - Sin internet o si las teselas no cargan: el mapa dibujado de la demo (calles y manzanas).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Platform, StyleSheet, View } from "react-native";
import { aPixel, metrosPorPixel, PROVEEDORES_TESELAS, teselasVisibles, zoomParaVer, type Coordenada } from "../../modelos/mapaOSM";
import { RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Texto } from "./Texto";

const CABECERAS = { "User-Agent": "Vecinos/1.0 (app comunitaria, Hackaton UTP 2026)" };

export interface PuntoMapa extends Coordenada {
  tipo: "yo" | "ayuda" | "vecino";
  etiqueta?: string;
  /** Color del punto (p. ej. el de cada tipo de lugar en «Ayuda cerca de ti»). */
  color?: string;
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
  const [cargadas, setCargadas] = useState(0);
  // Índice en PROVEEDORES_TESELAS (Esri → OSM → CARTO); si todos fallan, el mapa dibujado.
  const [proveedor, setProveedor] = useState(0);
  const fuente = PROVEEDORES_TESELAS[Math.min(proveedor, PROVEEDORES_TESELAS.length - 1)];
  const pulso = useRef(new Animated.Value(0)).current;
  const alto = Math.round(ancho * 0.78);

  useEffect(() => {
    const a = Animated.loop(Animated.timing(pulso, { toValue: 1, duration: 1400, useNativeDriver: Platform.OS !== "web" }));
    a.start();
    return () => a.stop();
  }, [pulso]);

  const vista = useMemo(() => {
    if (!ancho || puntos.length === 0) return null;
    // Un solo punto sin anillo: zoom 17 (se ven calles y manzanas alrededor, no solo un techo).
    const z = Math.min(zoomParaVer(puntos, anilloM ?? 0, ancho, alto), puntos.length === 1 && !anilloM ? 17 : 18);
    const px = puntos.map((p) => aPixel(p, z));
    const centro = {
      x: (Math.min(...px.map((p) => p.x)) + Math.max(...px.map((p) => p.x))) / 2,
      y: (Math.min(...px.map((p) => p.y)) + Math.max(...px.map((p) => p.y))) / 2,
    };
    const local = (p: { x: number; y: number }) => ({ left: p.x - centro.x + ancho / 2, top: p.y - centro.y + alto / 2 });
    return {
      teselas: teselasVisibles(centro, z, ancho, alto, fuente.plantilla),
      marcas: puntos.map((p, k) => ({ ...p, ...local(px[k]) })),
      anilloPx: anilloM ? anilloM / metrosPorPixel(puntos[0].lat, z) : 0,
    };
  }, [ancho, alto, puntos, anilloM, fuente.plantilla]);

  const muchosFallos = vista ? fallos >= Math.max(1, Math.ceil(vista.teselas.length / 2)) : false;
  useEffect(() => {
    if (muchosFallos && proveedor < PROVEEDORES_TESELAS.length) {
      setProveedor((p) => p + 1);
      setFallos(0);
      setCargadas(0);
    }
  }, [muchosFallos, proveedor]);
  // Si en 8 s no cargó ninguna tesela (red lenta o servidor que no responde), se prueba el siguiente.
  const hayVista = Boolean(vista);
  useEffect(() => {
    if (!hayVista || cargadas > 0 || proveedor >= PROVEEDORES_TESELAS.length) return;
    const t = setTimeout(() => {
      setProveedor((p) => p + 1);
      setFallos(0);
    }, 8000);
    return () => clearTimeout(t);
  }, [hayVista, cargadas, proveedor]);
  const sinTeselas = proveedor >= PROVEEDORES_TESELAS.length || muchosFallos;
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
      {/* Siempre debajo: mientras cargan las teselas (o si no cargan) se ve un mapa sencillo, no un hueco. */}
      <FondoDibujado oscuro={tema.oscuro} />
      {ancho > 0 && puntos.length === 0 ? (
        <View style={estilos.sinUbicacion} pointerEvents="none">
          <Texto variante="etiqueta" centrado>Aún no tengo la ubicación. Activa el GPS del teléfono.</Texto>
        </View>
      ) : null}
      {vista && !sinTeselas
        ? vista.teselas.map((t) => (
            <Image
              key={`${proveedor}-${t.clave}`}
              source={{ uri: t.url, headers: CABECERAS }}
              onLoad={() => setCargadas((n) => n + 1)}
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
            <View style={[estilos.puntoChico, { backgroundColor: m.color ?? (m.tipo === "yo" ? "#1F4E9C" : "#186B3A") }]} />
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
          <Texto variante="ayuda" style={estilos.atribucionTexto}>{fuente.atribucion}</Texto>
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
  sinUbicacion: { position: "absolute", left: 12, right: 12, top: "40%", backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 12, padding: 10 },
});
