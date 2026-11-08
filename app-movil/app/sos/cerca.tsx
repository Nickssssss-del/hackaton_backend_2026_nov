/**
 * Vista. «Ayuda cerca de ti»: radar de 1 o 2 km alrededor de la persona con postas y centros de
 * salud, hospitales, bomberos y comisarías (OpenStreetMap, con copia sin internet).
 * - Radar: tú al centro, anillos de la mitad y del total del radio, línea que gira y un punto de
 *   color por lugar, en su dirección y distancia reales (norte arriba).
 * - Lista del más cercano al más lejano: distancia, minutos a pie, «Llamar» (si OpenStreetMap
 *   tiene su teléfono) y «Cómo llegar» (abre el mapa del teléfono, a pie).
 */
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { llamar } from "../../src/controladores/llamadas";
import { TEXTO_FUENTE } from "../../src/controladores/ubicacionRapida";
import { useLugaresCercanos } from "../../src/controladores/useLugaresCercanos";
import { minutosAPie } from "../../src/modelos/geo";
import { distanciaLegible, ETIQUETA_TIPO, type LugarCercano, type TipoLugar } from "../../src/modelos/lugaresAyuda";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Icono, type NombreIcono } from "../../src/vistas/componentes/Icono";
import { MapaOSM } from "../../src/vistas/componentes/MapaOSM";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { colorIcono, RADIO, type ColorIcono } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

const ESTILO: Record<TipoLugar, { icono: NombreIcono; color: ColorIcono }> = {
  posta: { icono: "medical-bag", color: "verde" },
  hospital: { icono: "hospital-building", color: "turquesa" },
  bomberos: { icono: "fire-truck", color: "rojo" },
  policia: { icono: "police-badge-outline", color: "azul" },
};
const TIPOS: TipoLugar[] = ["posta", "hospital", "bomberos", "policia"];

export default function AyudaCerca() {
  const { tema } = useTema();
  const c = tema.colores;
  const [radio, setRadio] = useState(2000);
  const { posicion, cercanos, origen, fecha, cargando, sinUbicacion, actualizar } = useLugaresCercanos(radio);
  const [ancho, setAncho] = useState(0);
  const [vistaMapa, setVistaMapa] = useState(false);
  const giro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.timing(giro, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" }));
    a.start();
    return () => a.stop();
  }, [giro]);

  const R = ancho / 2 - 26;
  const punto = (l: LugarCercano) => {
    const f = Math.min(1, l.distancia / radio) * R;
    const a = (l.angulo * Math.PI) / 180;
    return { left: ancho / 2 + Math.sin(a) * f, top: ancho / 2 - Math.cos(a) * f };
  };
  const km = radio / 1000;
  const fechaCopia = fecha ? new Date(fecha).toLocaleDateString("es-PE", { day: "numeric", month: "long" }) : null;

  return (
    <Pantalla
      titulo="Ayuda cerca de ti"
      volver
      textoEscuchar={
        cercanos.length > 0
          ? `Ayuda cerca de ti, a ${km} kilómetros. El más cercano es ${cercanos[0].nombre}, a ${distanciaLegible(cercanos[0].distancia)}. Hay ${cercanos.length} lugares en total.`
          : `Ayuda cerca de ti, a ${km} kilómetros. No encontré lugares todavía.`
      }
    >
      <View style={[estilos.segmento, { backgroundColor: tema.oscuro ? c.superficie : "#EEEAE3" }]} accessibilityRole="tablist">
        {[1000, 2000].map((r) => {
          const activo = radio === r;
          return (
            <Pressable
              key={r}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              onPress={() => setRadio(r)}
              style={[estilos.pestana, activo && { backgroundColor: c.accion }]}
            >
              <Texto variante="etiqueta" centrado color={activo ? "#FFFFFF" : c.texto}>{`${r / 1000} km`}</Texto>
            </Pressable>
          );
        })}
      </View>

      <View style={estilos.fila}>
        {[
          { valor: false, texto: "Radar", icono: "radar" as const },
          { valor: true, texto: "Mapa", icono: "map-outline" as const },
        ].map((o) => {
          const activo = vistaMapa === o.valor;
          return (
            <Pressable
              key={o.texto}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              onPress={() => setVistaMapa(o.valor)}
              style={[estilos.chipVista, { borderColor: c.accion, backgroundColor: activo ? c.accionSuave : c.superficie }]}
            >
              <Icono nombre={o.icono} tamano={22} color={c.accionTexto} />
              <Texto variante="etiqueta" color={c.accionTexto}>{o.texto}</Texto>
            </Pressable>
          );
        })}
      </View>

      {vistaMapa ? (
        <>
          <MapaOSM
            puntos={
              posicion
                ? [
                    { tipo: "yo", lat: posicion.lat, lng: posicion.lng, etiqueta: "Tú" },
                    ...cercanos.map((l) => ({
                      tipo: "vecino" as const,
                      lat: l.lat,
                      lng: l.lng,
                      etiqueta: l.nombre,
                      color: colorIcono(ESTILO[l.tipo].color, tema.oscuro).icono,
                    })),
                  ]
                : []
            }
            anilloM={radio}
            descripcion={`Mapa con ${cercanos.length} lugares de ayuda a ${km} kilómetros de ti.`}
          />
          {posicion ? (
            <>
              <Texto variante="ayuda" color={c.textoSecundario}>{`${TEXTO_FUENTE[posicion.fuente]}${cargando ? " · buscando GPS…" : ""}`}</Texto>
              <BotonPrincipal
                variante="secundario"
                icono="map-search-outline"
                onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${posicion.lat},${posicion.lng}`)}
              >
                Abrir en el mapa del teléfono
              </BotonPrincipal>
            </>
          ) : null}
        </>
      ) : (
      <View
        onLayout={(e) => setAncho(Math.min(e.nativeEvent.layout.width, 360))}
        style={[estilos.radarCaja, { height: ancho || 300 }]}
        accessible
        accessibilityLabel={`Radar de ${km} kilómetros. Tú estás al centro. ${cercanos.length} lugares de ayuda.`}
      >
        {ancho > 0 ? (
          <View style={{ width: ancho, height: ancho }}>
            <View style={[estilos.anillo, { width: R * 2, height: R * 2, borderRadius: R, left: ancho / 2 - R, top: ancho / 2 - R, backgroundColor: c.accionSuave, borderColor: c.accion }]} />
            <View style={[estilos.anillo, estilos.mitad, { width: R, height: R, borderRadius: R / 2, left: ancho / 2 - R / 2, top: ancho / 2 - R / 2, borderColor: c.accion }]} />
            <Animated.View
              pointerEvents="none"
              style={[
                estilos.barrido,
                { width: R * 2, height: R * 2, left: ancho / 2 - R, top: ancho / 2 - R, transform: [{ rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] },
              ]}
            >
              <View style={[estilos.linea, { height: R, backgroundColor: c.accion }]} />
            </Animated.View>
            {/* Etiquetas de los anillos, abajo del centro (no tapan el norte ni los lugares de arriba). */}
            <View style={[estilos.etiquetaAnillo, { left: ancho / 2 - 40, top: ancho / 2 + R / 2 - 26, width: 80 }]}>
              <Texto variante="ayuda" centrado maxFontSizeMultiplier={1}>{radio === 2000 ? "1 km" : "500 m"}</Texto>
            </View>
            <View style={[estilos.etiquetaAnillo, { left: ancho / 2 - 40, top: ancho / 2 + R - 26, width: 80 }]}>
              <Texto variante="ayuda" centrado maxFontSizeMultiplier={1}>{`${km} km`}</Texto>
            </View>
            <View style={[estilos.norte, { left: ancho / 2 - 8, top: 0 }]}>
              <Texto variante="etiqueta" maxFontSizeMultiplier={1} color={c.textoSecundario}>N</Texto>
            </View>
            {cercanos.map((l) => {
              const p = punto(l);
              const t = colorIcono(ESTILO[l.tipo].color, tema.oscuro);
              return (
                <View key={l.id} style={[estilos.lugar, { left: p.left - 15, top: p.top - 15, backgroundColor: t.icono }]}>
                  <Icono nombre={ESTILO[l.tipo].icono} tamano={16} color="#FFFFFF" />
                </View>
              );
            })}
            <View style={[estilos.tu, { left: ancho / 2 - 14, top: ancho / 2 - 14, backgroundColor: c.accion }]} />
          </View>
        ) : null}
      </View>
      )}

      <View style={estilos.leyenda}>
        {TIPOS.map((t) => {
          const col = colorIcono(ESTILO[t].color, tema.oscuro);
          const n = cercanos.filter((l) => l.tipo === t).length;
          return (
            <View key={t} style={[estilos.chip, { backgroundColor: col.fondo }]}>
              <Icono nombre={ESTILO[t].icono} tamano={20} color={col.icono} />
              <Texto variante="ayuda" color={c.texto}>{`${ETIQUETA_TIPO[t]} · ${n}`}</Texto>
            </View>
          );
        })}
      </View>

      {cargando ? <Texto variante="ayuda">Buscando lugares cerca de ti… puede tardar hasta un minuto.</Texto> : null}
      {sinUbicacion ? <Mensaje tono="aviso">No sé dónde estás. Activa la ubicación del teléfono y toca Actualizar.</Mensaje> : null}
      {!cargando && posicion && origen === "ninguno" ? (
        <>
          <Mensaje tono="aviso">
            No pude cargar los lugares: no hay internet o el servidor de mapas no respondió. Con internet, los guardo para usarlos sin conexión.
          </Mensaje>
          <BotonPrincipal variante="tocar" icono="refresh" onPress={() => void actualizar()}>
            Volver a intentar
          </BotonPrincipal>
        </>
      ) : null}
      {!cargando && origen !== "ninguno" && cercanos.length === 0 ? (
        <Mensaje tono="info">{`No hay lugares registrados a ${km} km. Prueba con 2 km o llama al 106, 105 o 116.`}</Mensaje>
      ) : null}
      {posicion?.fuente === "casa" && !cargando ? <Mensaje tono="info">Uso la ubicación de tu casa: no hubo señal de GPS.</Mensaje> : null}

      {cercanos.map((l) => (
        <TarjetaLugar key={l.id} lugar={l} />
      ))}

      <BotonPrincipal variante="secundario" icono="refresh" cargando={cargando} onPress={() => void actualizar()}>
        Actualizar
      </BotonPrincipal>
      <Texto variante="ayuda">
        {`Lugares de OpenStreetMap${fechaCopia ? ` (copia del ${fechaCopia})` : ""}. Pueden faltar lugares o teléfonos; ante la duda, llama al 106.`}
      </Texto>
    </Pantalla>
  );
}

function TarjetaLugar({ lugar }: { lugar: LugarCercano }) {
  const { tema } = useTema();
  const c = tema.colores;
  const t = colorIcono(ESTILO[lugar.tipo].color, tema.oscuro);
  const comoLlegar = () =>
    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lugar.lat},${lugar.lng}&travelmode=walking`);
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <View style={estilos.fila}>
        <View style={[estilos.circulo, { backgroundColor: t.fondo }]}>
          <Icono nombre={ESTILO[lugar.tipo].icono} tamano={28} color={t.icono} />
        </View>
        <View style={{ flex: 1 }}>
          <Texto variante="etiqueta">{lugar.nombre}</Texto>
          <Texto variante="ayuda">{`${ETIQUETA_TIPO[lugar.tipo]} · ${distanciaLegible(lugar.distancia)} · ${minutosAPie(lugar.distancia)} min a pie`}</Texto>
          {lugar.direccion ? <Texto variante="ayuda">{lugar.direccion}</Texto> : null}
        </View>
      </View>
      <View style={estilos.fila}>
        {lugar.telefono ? (
          <View style={{ flex: 1 }}>
            <BotonPrincipal variante="emergencia" icono="phone" onPress={() => void llamar(lugar.telefono ?? "")}>
              Llamar
            </BotonPrincipal>
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <BotonPrincipal variante="secundario" icono="walk" onPress={comoLlegar}>
            Cómo llegar
          </BotonPrincipal>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  segmento: { flexDirection: "row", borderRadius: RADIO.l, padding: 6, gap: 6 },
  pestana: { flex: 1, minHeight: 52, borderRadius: RADIO.m, alignItems: "center", justifyContent: "center" },
  radarCaja: { alignItems: "center", justifyContent: "center" },
  anillo: { position: "absolute", borderWidth: 2 },
  mitad: { borderStyle: "dashed", backgroundColor: "transparent" },
  barrido: { position: "absolute", alignItems: "center" },
  linea: { width: 3, borderRadius: 2, opacity: 0.5 },
  etiquetaAnillo: { position: "absolute" },
  norte: { position: "absolute" },
  lugar: { position: "absolute", width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  tu: { position: "absolute", width: 28, height: 28, borderRadius: 14, borderWidth: 4, borderColor: "#FFFFFF" },
  leyenda: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: RADIO.m, paddingHorizontal: 10, paddingVertical: 6 },
  tarjeta: { borderWidth: 1.5, borderRadius: RADIO.l, padding: 12, gap: 10 },
  fila: { flexDirection: "row", alignItems: "center", gap: 10 },
  chipVista: { flex: 1, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 2, borderRadius: RADIO.m },
  circulo: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
});
