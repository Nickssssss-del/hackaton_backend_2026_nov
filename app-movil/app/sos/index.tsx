/**
 * Vista. G1 · ¿Estás bien? (Mockup v4, p. 23). Fondo amarillo, sin «Volver».
 * Cuenta 1 minuto (decisión del equipo; el mockup muestra 10 s) con un punto que gira alrededor
 * del círculo y el número grande al centro. Vibra cada 5 s y cada segundo en los últimos 10;
 * la voz recuerda a los 30 y a los 10 segundos.
 * - Si la persona puede, llama ella misma: Policía 105, Bomberos 116 o Ambulancia 106 (SAMU).
 *   Al tocar uno, la cuenta se detiene: si pudo tocar, está consciente.
 * - Si no responde en 1 minuto (caída, desmayo), pasa sola a G2: ubicación y cascada de llamadas.
 * Tocar el círculo pide ayuda de inmediato. «Estoy bien, fue un error» vuelve al Inicio.
 */
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, Vibration, View } from "react-native";
import { leerPerfil } from "../../src/controladores/registroVecinos";
import { useEmergencia } from "../../src/controladores/useEmergencia";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { aQuienLlamamos } from "../../src/modelos/cascadaEmergencia";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Icono, type NombreIcono } from "../../src/vistas/componentes/Icono";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

const SEGUNDOS = 60;
const ANILLO = 210;
const GROSOR = 18;

export default function EstasBien() {
  const { tema } = useTema();
  const c = tema.colores;
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const { escuchar, silenciar } = useEscuchar();
  const [nombre, setNombre] = useState("");
  const emergencia = useEmergencia();
  const personas = aQuienLlamamos(emergencia.contactos, Boolean(emergencia.brigada?.contacto));
  const [restan, setRestan] = useState(SEGUNDOS);
  const giro = useRef(new Animated.Value(0)).current;
  const latido = useRef(new Animated.Value(1)).current;
  const fuera = useRef(false);
  const [pausado, setPausado] = useState<string | null>(null);

  const pedirAyuda = useCallback(() => {
    if (fuera.current) return;
    fuera.current = true;
    silenciar();
    Vibration.cancel();
    router.replace({ pathname: "/sos/pidiendo", params: demo === "1" ? { demo: "1" } : {} });
  }, [demo, silenciar]);

  const estoyBien = () => {
    fuera.current = true;
    silenciar();
    Vibration.cancel();
    if (router.canGoBack()) router.back();
    else router.replace("/principal");
  };

  useEffect(() => {
    void leerPerfil().then((perfil) => {
      const n = perfil.nombre?.trim().split(/\s+/)[0] ?? "";
      setNombre(n);
      void escuchar(`¿Estás bien${n ? `, ${n}` : ""}? Si no respondes en un minuto, te ayudo a pedir ayuda. Si puedes, llama tú a la policía, a los bomberos o a la ambulancia.`, true);
    });
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuenta regresiva y animación; se detiene si la pantalla pierde el foco.
  useFocusEffect(
    useCallback(() => {
      if (pausado) return;
      fuera.current = false;
      setRestan(SEGUNDOS);
      giro.setValue(0);
      const vuelta = Animated.timing(giro, {
        toValue: 1,
        duration: SEGUNDOS * 1000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      });
      const pulso = Animated.loop(
        Animated.sequence([
          Animated.timing(latido, { toValue: 1.06, duration: 500, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(latido, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== "web" }),
        ]),
      );
      vuelta.start();
      pulso.start();
      const reloj = setInterval(() => {
        setRestan((r) => {
          const siguiente = r - 1;
          if (siguiente > 0 && Platform.OS !== "web" && (siguiente <= 10 || siguiente % 5 === 0)) Vibration.vibrate(150);
          return siguiente;
        });
      }, 1000);
      return () => {
        clearInterval(reloj);
        vuelta.stop();
        pulso.stop();
        Vibration.cancel();
      };
    }, [giro, latido, pausado]),
  );

  useEffect(() => {
    if (pausado) return;
    if (restan <= 0) pedirAyuda();
    else if (restan === 30) void escuchar("Quedan 30 segundos. Toca el botón verde si estás bien.", true);
    else if (restan === 10) void escuchar("Quedan 10 segundos.", true);
  }, [restan, pedirAyuda, pausado, escuchar]);

  const llamarYa = (nombre: string, numero: string) => {
    silenciar();
    Vibration.cancel();
    setPausado(nombre);
    if (demo === "1") return;
    void Linking.openURL(`tel:${numero}`).catch(() => undefined);
  };

  const rotacion = giro.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const titulo = nombre ? `¿Estás bien, ${nombre}?` : "¿Estás bien?";

  return (
    <Pantalla
      fondo="aviso"
      textoEscuchar={`${titulo} Si puedes, llama tú: Policía 105, Bomberos 116 o Ambulancia 106. Si no respondes en ${restan} segundos, te ayudo a avisar a tus vecinos dónde estás y a llamar a ${personas}. Si estás bien, toca el botón verde de abajo.`}
      pie={
        <BotonPrincipal variante="listo" icono="check" onPress={estoyBien}>
          Estoy bien, fue un error
        </BotonPrincipal>
      }
    >
      {demo === "1" ? <Mensaje tono="info">Demo: no se llamará a nadie.</Mensaje> : null}
      <Texto variante="titulo" centrado accessibilityRole="header" color={c.avisoTexto}>{titulo}</Texto>

      {pausado ? (
        <>
          <Mensaje tono="listo">{demo === "1" ? `Demo: aquí se abriría la llamada a ${pausado}. La cuenta se detuvo.` : `Abrimos la llamada a ${pausado}. La cuenta se detuvo porque pudiste tocar.`}</Mensaje>
          <BotonPrincipal variante="emergencia" icono="account-group-outline" onPress={() => { setPausado(null); pedirAyuda(); }}>
            Avisar también a mis contactos
          </BotonPrincipal>
        </>
      ) : (
        <View style={estilos.centro}>
          <Animated.View style={{ transform: [{ scale: latido }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Faltan ${restan} segundos. Toca para pedir ayuda ahora.`}
              onPress={pedirAyuda}
              style={[estilos.anillo, { borderColor: tema.oscuro ? "#5A4A28" : "#F1E3C4" }]}
            >
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, estilos.giro, { transform: [{ rotate: rotacion }] }]}>
                <View style={estilos.punto} />
              </Animated.View>
              <View style={[estilos.circulo, { backgroundColor: c.superficie }]}>
                <Texto variante="grande" centrado style={estilos.numero} maxFontSizeMultiplier={1.2}>
                  {String(Math.max(restan, 0))}
                </Texto>
                <Texto variante="etiqueta" centrado color={c.textoSecundario}>segundos</Texto>
              </View>
            </Pressable>
          </Animated.View>
          <Texto variante="ayuda" centrado color={c.avisoTexto}>Toca el círculo para pedir ayuda ya</Texto>
        </View>
      )}

      <Texto variante="subtitulo" color={c.avisoTexto}>Si puedes, llama tú:</Texto>
      <View style={estilos.llamadas}>
        <BotonLlamada icono="police-badge-outline" titulo="Policía" numero="105" onPress={() => llamarYa("la Policía (105)", "105")} />
        <BotonLlamada icono="fire-truck" titulo="Bomberos" numero="116" onPress={() => llamarYa("los Bomberos (116)", "116")} />
        <BotonLlamada icono="ambulance" titulo="Ambulancia" numero="106" onPress={() => llamarYa("la ambulancia del SAMU (106)", "106")} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/sos/cerca")}
        style={[estilos.radar, { backgroundColor: c.superficie, borderColor: c.accion }]}
      >
        <Icono nombre="radar" tamano={30} color={c.accionTexto} />
        <View style={{ flex: 1 }}>
          <Texto variante="etiqueta">Ayuda cerca de ti</Texto>
          <Texto variante="ayuda">Postas, hospitales, bomberos y policía a 2 km</Texto>
        </View>
        <Icono nombre="chevron-right" tamano={28} color={c.accionTexto} />
      </Pressable>

      {pausado ? null : (
        <>
          <Texto variante="subtitulo" color={c.avisoTexto}>Si no respondes en 1 minuto, te ayudo a:</Texto>
          <Accion icono="map-marker-outline" texto="Que tus vecinos vean dónde estás" />
          <Accion icono="phone-outline" texto={`Llamar a ${personas}, en orden`} />
          {emergencia.contactos.length === 0 ? (
            <Texto variante="ayuda" color={c.avisoTexto}>Aún no eliges personas de confianza: agrégalas en Mis datos › Mis contactos.</Texto>
          ) : null}
          <Accion icono="plus-outline" texto="Si no contestan: 106, 105 y 116" />
        </>
      )}
    </Pantalla>
  );
}

function BotonLlamada({ icono, titulo, numero, onPress }: { icono: NombreIcono; titulo: string; numero: string; onPress: () => void }) {
  const { tema } = useTema();
  const c = tema.colores;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Llamar a ${titulo}, ${numero.split("").join(" ")}`}
      onPress={onPress}
      style={({ pressed }) => [estilos.llamada, { backgroundColor: c.superficie, borderColor: c.peligro, opacity: pressed ? 0.85 : 1 }]}
    >
      <Icono nombre={icono} tamano={32} color={c.peligro} />
      <Texto variante="subtitulo" style={{ flex: 1 }}>{titulo}</Texto>
      <Texto variante="subtitulo" color={c.peligro}>{numero}</Texto>
      <Icono nombre="phone" tamano={26} color={c.peligro} />
    </Pressable>
  );
}

function Accion({ icono, texto }: { icono: NombreIcono; texto: string }) {
  const { tema } = useTema();
  return (
    <View style={estilos.accion}>
      <View style={[estilos.iconoAccion, { backgroundColor: tema.colores.superficie }]}>
        <Icono nombre={icono} tamano={28} color={tema.colores.peligro} />
      </View>
      <Texto variante="etiqueta" color={tema.colores.avisoTexto} style={{ flex: 1 }}>{texto}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: "center", gap: 10, marginVertical: 6 },
  anillo: {
    width: ANILLO,
    height: ANILLO,
    borderRadius: ANILLO / 2,
    borderWidth: GROSOR,
    alignItems: "center",
    justifyContent: "center",
  },
  giro: { alignItems: "center", margin: -GROSOR },
  punto: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#C2701F", marginTop: GROSOR / 2 - 15 },
  circulo: { width: ANILLO - GROSOR * 2 - 12, height: ANILLO - GROSOR * 2 - 12, borderRadius: ANILLO, alignItems: "center", justifyContent: "center" },
  numero: { fontSize: 72, lineHeight: 84 },
  accion: { flexDirection: "row", alignItems: "center", gap: 14 },
  llamadas: { gap: 10 },
  radar: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 2, borderRadius: RADIO.l, padding: 12, minHeight: 64 },
  llamada: { flexDirection: "row", minHeight: 64, borderWidth: 2.5, borderRadius: RADIO.l, alignItems: "center", paddingHorizontal: 14, gap: 12 },
  iconoAccion: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
