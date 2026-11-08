/**
 * Vista. G2 · Pidiendo ayuda (Mockup v4, p. 24).
 * Cascada numerada: personas de confianza → 106 SAMU → 105 Policía → 116 Bomberos.
 *
 * Modo real (asistido y honesto): la app no llama ni envía mensajes sola. En el paso actual hay
 * un botón grande «Llamar a …» (abre el marcador) y luego «Viene en camino» / «No contestó».
 * La franja verde abre Mensajes con tu ubicación ya escrita: la persona toca Enviar.
 *
 * Modo demo (`demo=1`): la cascada avanza sola, como en el mockup, con letrero de demostración.
 * «Repetir demo» la vuelve a empezar. La franja abre G3 (lo que ve el vecino).
 */
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { useEmergencia } from "../../src/controladores/useEmergencia";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import {
  armarCascada,
  GUION_DEMO,
  noContesto,
  pasoActual,
  textoEstado,
  viene,
  type PasoCascada,
} from "../../src/modelos/cascadaEmergencia";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

const CONTACTOS_DEMO = [
  { nombre: "Ana", telefono: "900000001" },
  { nombre: "Jorge", telefono: "900000002" },
];

export default function PidiendoAyuda() {
  const { tema } = useTema();
  const c = tema.colores;
  const esDemo = useLocalSearchParams<{ demo?: string }>().demo === "1";
  const emergencia = useEmergencia();
  const { escuchar } = useEscuchar();
  const [pasos, setPasos] = useState<PasoCascada[]>([]);
  const [llamado, setLlamado] = useState(false);
  const [ubicacionAbierta, setUbicacionAbierta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [vueltaDemo, setVueltaDemo] = useState(0);
  const latido = useRef(new Animated.Value(1)).current;

  const contactos = esDemo ? CONTACTOS_DEMO : emergencia.contactos;
  const nombres = contactos.slice(0, 2).map((x) => x.nombre.trim()).filter(Boolean);

  // Armar la cascada cuando se leen los contactos (o al repetir la demo).
  useEffect(() => {
    if (!esDemo && emergencia.cargando) return;
    setPasos(armarCascada(contactos));
    setLlamado(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esDemo, emergencia.cargando, vueltaDemo]);

  // Ícono del teléfono late mientras se pide ayuda.
  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 1.12, duration: 450, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(latido, { toValue: 1, duration: 450, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [latido]);

  // Demo: la cascada avanza sola cada 2,5 s según el guion del mockup.
  useEffect(() => {
    if (!esDemo || pasos.length === 0) return;
    const i = pasoActual(pasos);
    if (i < 0) return;
    const accion = GUION_DEMO[i] ?? "viene";
    const t = setTimeout(() => {
      setPasos((p) => (accion === "viene" ? viene(p) : noContesto(p)));
      if (accion === "viene") void escuchar(`${pasos[i].titulo} viene en camino.`, true);
    }, 2500);
    return () => clearTimeout(t);
  }, [esDemo, pasos, escuchar]);

  const i = pasoActual(pasos);
  const actual = i >= 0 ? pasos[i] : null;
  const alguienViene = pasos.find((p) => p.estado === "viene");

  const llamar = useCallback(async () => {
    if (!actual) return;
    setLlamado(true);
    try {
      await emergencia.llamar(actual.telefono);
    } catch {
      setAviso(`No se pudo abrir el teléfono. Marca tú el ${actual.telefono}.`);
    }
  }, [actual, emergencia]);

  const enviarUbicacion = async () => {
    if (esDemo) {
      router.push({ pathname: "/sos/vecino", params: { demo: "1" } });
      return;
    }
    setAviso(null);
    try {
      const r = await emergencia.necesitoAyuda();
      if (r.estado === "pedir_numero") {
        setAviso("Aún no tienes personas de confianza. Agrégalas en Mis datos › Mis contactos.");
        return;
      }
      setUbicacionAbierta(true);
      setAviso(r.smsDisponible ? "Se abrió Mensajes con tu ubicación. Toca Enviar." : "Este teléfono no puede enviar mensajes. Llama con los botones de abajo.");
    } catch {
      setAviso("No se pudo preparar el mensaje. Llama con los botones de abajo.");
    }
  };

  const cancelar = async () => {
    if (!esDemo && ubicacionAbierta) {
      try {
        await emergencia.estoyBien();
      } catch {
        // Si no hay SMS, igual se sale.
      }
    }
    router.dismissTo("/principal");
  };

  const franja = esDemo
    ? `${nombres.join(", ")} y 4 vecinos ven dónde estás`
    : ubicacionAbierta
      ? "Ubicación lista en Mensajes"
      : nombres.length > 0
        ? `Enviar mi ubicación a ${nombres.join(" y ")}`
        : "Enviar mi ubicación";

  const textoEscuchar = alguienViene
    ? `${alguienViene.titulo} viene en camino. Quédate donde estás.`
    : actual
      ? esDemo
        ? `Pidiendo ayuda. Llamando a ${actual.titulo}.`
        : `Pidiendo ayuda. Toca el botón rojo para llamar a ${actual.titulo}. Después cuéntame si viene o no contestó.`
      : "Pidiendo ayuda.";

  return (
    <Pantalla
      textoEscuchar={textoEscuchar}
      pie={
        <>
          <BotonPrincipal variante="secundarioListo" icono="close" onPress={() => void cancelar()}>
            Estoy bien, cancelar
          </BotonPrincipal>
          {esDemo ? (
            <Pressable accessibilityRole="button" onPress={() => setVueltaDemo((v) => v + 1)} style={estilos.enlace}>
              <Texto variante="etiqueta" color={c.textoSecundario} style={estilos.subrayado}>Repetir demo</Texto>
            </Pressable>
          ) : null}
        </>
      }
    >
      <View style={[estilos.cabecera, { backgroundColor: c.peligro }]} accessibilityRole="header">
        <Animated.View style={[estilos.circuloBlanco, { transform: [{ scale: alguienViene ? 1 : latido }] }]}>
          <Icono nombre="phone-outline" tamano={34} color={c.peligro} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Texto variante="titulo" color="#FFFFFF">{alguienViene ? "Ayuda en camino" : "Pidiendo ayuda"}</Texto>
          <Texto color="#FFFFFF">
            {esDemo ? "No tienes que tocar nada" : alguienViene ? "Quédate donde estás" : "Te acompaño paso a paso"}
          </Texto>
        </View>
      </View>

      {esDemo ? <Mensaje tono="info">Demo: así funcionará cuando la app pueda llamar sola.</Mensaje> : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => void enviarUbicacion()}
        style={[estilos.franja, { backgroundColor: c.confirmadoSuave }]}
      >
        <Icono nombre="map-marker-outline" tamano={28} color={c.confirmado} />
        <Texto variante="etiqueta" color={c.confirmado} style={{ flex: 1 }}>{franja}</Texto>
        <Icono nombre="chevron-right" tamano={28} color={c.confirmado} />
      </Pressable>
      {aviso ? <Mensaje tono="aviso">{aviso}</Mensaje> : null}

      {pasos.length > 0 && !actual && !alguienViene ? (
        <>
          <Mensaje tono="aviso">Nadie contestó. Vuelve a intentarlo o pide ayuda a alguien que esté cerca.</Mensaje>
          <BotonPrincipal variante="emergencia" icono="refresh" onPress={() => setPasos(armarCascada(contactos))}>
            Volver a intentar
          </BotonPrincipal>
        </>
      ) : null}

      {pasos.map((p, k) => (
        <View key={p.id} style={estilos.acciones}>
          <TarjetaPaso
            numero={k + 1}
            paso={p}
            textoAhora={esDemo ? "Llamando…" : llamado ? "¿Contestó?" : "Toca Llamar"}
          />
          {!esDemo && actual && k === i ? (
            <View style={estilos.acciones}>
              <BotonPrincipal variante="emergencia" icono="phone" onPress={() => void llamar()}>
                {`Llamar a ${actual.titulo}`}
              </BotonPrincipal>
              {llamado ? (
                <View style={estilos.fila}>
                  <View style={{ flex: 1 }}>
                    <BotonPrincipal variante="listo" onPress={() => { setPasos(viene); setLlamado(false); }}>
                      Viene
                    </BotonPrincipal>
                  </View>
                  <View style={{ flex: 1 }}>
                    <BotonPrincipal variante="neutro" onPress={() => { setPasos(noContesto); setLlamado(false); }}>
                      No contestó
                    </BotonPrincipal>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}

    </Pantalla>
  );
}

function TarjetaPaso({ numero, paso, textoAhora }: { numero: number; paso: PasoCascada; textoAhora: string }) {
  const { tema } = useTema();
  const c = tema.colores;
  const apagado = paso.estado === "no_hizo_falta" || paso.estado === "espera";
  const verde = paso.estado === "viene";
  const ahora = paso.estado === "llamando";
  const colorNumero = verde ? c.confirmado : ahora ? c.peligro : apagado ? "#B5B0A6" : "#8C857A";
  const borde = verde ? c.confirmado : ahora ? c.peligro : c.borde;
  return (
    <View
      accessible
      accessibilityLabel={`${numero}. ${paso.titulo}. ${ahora ? textoAhora : textoEstado(paso.estado)}`}
      style={[
        estilos.paso,
        { backgroundColor: apagado ? (tema.oscuro ? c.fondo : "#FAF9F6") : c.superficie, borderColor: borde, borderWidth: verde || ahora ? 2.5 : 1.5 },
      ]}
    >
      <View style={[estilos.numero, { backgroundColor: colorNumero }]}>
        <Texto variante="subtitulo" color="#FFFFFF">{String(numero)}</Texto>
      </View>
      <View style={{ flex: 1 }}>
        <Texto variante="subtitulo" color={apagado ? c.textoSecundario : c.texto}>{paso.titulo}</Texto>
        <Texto variante="etiqueta" color={verde ? c.confirmado : ahora ? c.peligro : c.textoSecundario}>
          {ahora ? textoAhora : textoEstado(paso.estado)}
        </Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: RADIO.l, padding: 16 },
  circuloBlanco: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  franja: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: RADIO.l, padding: 14, minHeight: 64 },
  paso: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: RADIO.l, padding: 12 },
  numero: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  acciones: { gap: 10 },
  fila: { flexDirection: "row", gap: 10 },
  enlace: { alignItems: "center", paddingVertical: 8 },
  subrayado: { textDecorationLine: "underline" },
});
