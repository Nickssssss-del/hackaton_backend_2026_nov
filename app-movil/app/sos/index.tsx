/**
 * Vista. G1 · ¿Estás bien? (Mockup v4, p. 23). Fondo amarillo, sin «Volver».
 * Cuenta 10 segundos con un punto que gira alrededor del círculo y el número grande al centro;
 * el teléfono vibra cada segundo y la voz lo dice. Si no responde, pasa solo a G2.
 * Tocar el círculo pide ayuda de inmediato. «Estoy bien, fue un error» vuelve al Inicio.
 */
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Vibration, View } from "react-native";
import { leerContactos, leerPerfil } from "../../src/controladores/registroVecinos";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { nombresContactos } from "../../src/modelos/cascadaEmergencia";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Icono, type NombreIcono } from "../../src/vistas/componentes/Icono";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { useTema } from "../../src/vistas/tema/useTema";

const SEGUNDOS = 10;
const ANILLO = 230;
const GROSOR = 18;

export default function EstasBien() {
  const { tema } = useTema();
  const c = tema.colores;
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const { escuchar, silenciar } = useEscuchar();
  const [nombre, setNombre] = useState("");
  const [personas, setPersonas] = useState("tus personas de confianza");
  const [restan, setRestan] = useState(SEGUNDOS);
  const giro = useRef(new Animated.Value(0)).current;
  const latido = useRef(new Animated.Value(1)).current;
  const fuera = useRef(false);

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
    void Promise.all([leerPerfil(), leerContactos()]).then(([perfil, contactos]) => {
      const n = perfil.nombre?.trim().split(/\s+/)[0] ?? "";
      setNombre(n);
      setPersonas(demo === "1" ? "Ana y Jorge" : nombresContactos(contactos));
      void escuchar(`¿Estás bien${n ? `, ${n}` : ""}? Si no respondes en ${SEGUNDOS} segundos, te ayudo a pedir ayuda.`, true);
    });
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuenta regresiva y animación; se detiene si la pantalla pierde el foco.
  useFocusEffect(
    useCallback(() => {
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
          if (siguiente > 0 && Platform.OS !== "web") Vibration.vibrate(120);
          return siguiente;
        });
      }, 1000);
      return () => {
        clearInterval(reloj);
        vuelta.stop();
        pulso.stop();
        Vibration.cancel();
      };
    }, [giro, latido]),
  );

  useEffect(() => {
    if (restan <= 0) pedirAyuda();
  }, [restan, pedirAyuda]);

  const rotacion = giro.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const titulo = nombre ? `¿Estás bien, ${nombre}?` : "¿Estás bien?";

  return (
    <Pantalla
      fondo="aviso"
      textoEscuchar={`${titulo} Si no respondes en ${restan} segundos te ayudo a avisar a tus vecinos dónde estás y a llamar a ${personas}. Si no contestan, al 106, 105 y 116. Si estás bien, toca el botón verde de abajo.`}
      pie={
        <BotonPrincipal variante="listo" icono="check" onPress={estoyBien}>
          Estoy bien, fue un error
        </BotonPrincipal>
      }
    >
      {demo === "1" ? <Mensaje tono="info">Demo: no se llamará a nadie.</Mensaje> : null}
      <Texto variante="titulo" centrado accessibilityRole="header" color={c.avisoTexto}>{titulo}</Texto>

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

      <Texto variante="subtitulo" centrado color={c.avisoTexto}>Si no respondes, te ayudo a:</Texto>
      <Accion icono="account-group-outline" texto="Que tus vecinos vean dónde estás" />
      <Accion icono="phone-outline" texto={`Llamar a ${personas}`} />
      <Accion icono="plus-outline" texto="Si no contestan: 106, 105, 116" />
    </Pantalla>
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
  iconoAccion: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
