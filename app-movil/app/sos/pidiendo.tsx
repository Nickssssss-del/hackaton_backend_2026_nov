/**
 * Vista. G2 · Pidiendo ayuda (Mockup v4, p. 24). «No tienes que tocar nada».
 * Cascada numerada: tus personas de confianza → comité vecinal → 106 SAMU → 105 → 116.
 *
 * Modo real: la app LLAMA SOLA al paso actual (controladores/llamadas.ts). Al volver de la
 * llamada pregunta «¿Contestó?» con «Viene» / «No contestó»; si nadie toca nada en 20 s,
 * pasa sola al siguiente y vuelve a llamar. Con 105/116/106 Android solo deja abrir el marcador
 * con el número listo: la persona toca el botón verde del teléfono.
 * La franja verde abre Mensajes con la ubicación ya escrita (hay que tocar Enviar).
 *
 * Modo demo (`demo=1`): no llama a nadie; la cascada avanza sola. Usa tus contactos reales
 * si los tienes (nunca nombres inventados). La franja abre G3 (lo que ve el vecino).
 */
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Platform, Pressable, StyleSheet, View } from "react-native";
import { llamar as llamarNumero } from "../../src/controladores/llamadas";
import { postaMasCercana } from "../../src/controladores/useLugaresCercanos";
import { useEmergencia } from "../../src/controladores/useEmergencia";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import {
  accionDemo,
  armarCascada,
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

const ESPERA_RESPUESTA = 20;
type Fase = "llamando" | "pregunta" | null;

export default function PidiendoAyuda() {
  const { tema } = useTema();
  const c = tema.colores;
  const esDemo = useLocalSearchParams<{ demo?: string }>().demo === "1";
  const emergencia = useEmergencia();
  const { escuchar } = useEscuchar();
  const [pasos, setPasos] = useState<PasoCascada[]>([]);
  const [fase, setFase] = useState<Fase>(null);
  const [restan, setRestan] = useState(ESPERA_RESPUESTA);
  const [ubicacionAbierta, setUbicacionAbierta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [vueltaDemo, setVueltaDemo] = useState(0);
  const llamadoPara = useRef<string | null>(null);
  const faseRef = useRef<Fase>(null);
  const latido = useRef(new Animated.Value(1)).current;
  faseRef.current = fase;

  const contactos = emergencia.contactos;
  const comite = emergencia.brigada?.contacto ? { nombre: emergencia.brigada.nombre, telefono: emergencia.brigada.contacto } : null;
  const [salud, setSalud] = useState<{ nombre: string; telefono: string } | null | undefined>(undefined);

  // Posta u hospital más cercano con teléfono, de la copia del radar (sin esperar a internet).
  useEffect(() => {
    void postaMasCercana().then(setSalud);
  }, []);
  const nombres = contactos.slice(0, 2).map((x) => x.nombre.trim()).filter(Boolean);

  // Armar la cascada cuando se leen los contactos (o al repetir la demo).
  useEffect(() => {
    if (emergencia.cargando || salud === undefined) return;
    setPasos(armarCascada(contactos, comite, salud));
    setFase(null);
    llamadoPara.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emergencia.cargando, vueltaDemo, salud]);

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

  const i = pasoActual(pasos);
  const actual = i >= 0 ? pasos[i] : null;
  const alguienViene = pasos.find((p) => p.estado === "viene");

  const llamarActual = useCallback(async (paso: PasoCascada) => {
    setAviso(null);
    setFase("llamando");
    const r = await llamarNumero(paso.telefono);
    if (r === "error") setAviso(`No se pudo abrir el teléfono. Marca tú el ${paso.telefono}.`);
    if (r === "marcador" && paso.tipo === "servicio") setAviso(`Toca el botón verde del teléfono para llamar al ${paso.telefono}.`);
    // En la web no se sale de la app: se pregunta enseguida.
    if (r === "error" || Platform.OS === "web") {
      setFase("pregunta");
      setRestan(ESPERA_RESPUESTA);
    }
  }, []);

  // Real: al llegar a un paso nuevo, la app llama sola.
  useEffect(() => {
    if (esDemo || !actual || llamadoPara.current === actual.id) return;
    llamadoPara.current = actual.id;
    void escuchar(`Llamando a ${actual.titulo}.`, true);
    void llamarActual(actual);
  }, [esDemo, actual, llamarActual, escuchar]);

  // Real: al volver de la llamada, se pregunta si contestó.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active" && faseRef.current === "llamando") {
        setFase("pregunta");
        setRestan(ESPERA_RESPUESTA);
      }
    });
    return () => sub.remove();
  }, []);

  // Si nadie responde la pregunta, se pasa solo al siguiente.
  useEffect(() => {
    if (fase !== "pregunta") return;
    if (restan <= 0) {
      setFase(null);
      setPasos(noContesto);
      return;
    }
    const t = setTimeout(() => setRestan((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [fase, restan]);

  // Demo: la cascada avanza sola cada 2,5 s.
  useEffect(() => {
    if (!esDemo || !actual) return;
    const accion = accionDemo(actual);
    const t = setTimeout(() => {
      setPasos((p) => (accion === "viene" ? viene(p) : noContesto(p)));
      if (accion === "viene") void escuchar(`${actual.titulo} viene en camino.`, true);
    }, 2500);
    return () => clearTimeout(t);
  }, [esDemo, actual, escuchar]);

  const responder = (contesto: boolean) => {
    setFase(null);
    setPasos(contesto ? viene : noContesto);
  };

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
      setAviso(r.smsDisponible ? "Se abrió Mensajes con tu ubicación. Toca Enviar." : "Este teléfono no puede enviar mensajes.");
    } catch {
      setAviso("No se pudo preparar el mensaje.");
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
    ? `${[...nombres, "4 vecinos"].join(", ")} ven dónde estás`
    : ubicacionAbierta
      ? "Ubicación lista en Mensajes"
      : nombres.length > 0
        ? `Enviar mi ubicación a ${nombres.join(" y ")}`
        : "Enviar mi ubicación por mensaje";

  const textoAhora = esDemo ? "Llamando…" : fase === "pregunta" ? `¿Contestó? (${restan} s)` : "Llamando…";
  const textoEscuchar = alguienViene
    ? `${alguienViene.titulo} viene en camino. Quédate donde estás.`
    : actual
      ? `Pidiendo ayuda. ${fase === "pregunta" ? `¿Contestó ${actual.titulo}? Toca Viene o No contestó.` : `Llamando a ${actual.titulo}.`}`
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
          <Texto color="#FFFFFF">{alguienViene ? "Quédate donde estás" : "No tienes que tocar nada"}</Texto>
        </View>
      </View>

      {esDemo ? <Mensaje tono="info">Demo: no se llama a nadie.</Mensaje> : null}

      <Pressable accessibilityRole="button" onPress={() => void enviarUbicacion()} style={[estilos.franja, { backgroundColor: c.confirmadoSuave }]}>
        <Icono nombre="map-marker-outline" tamano={28} color={c.confirmado} />
        <Texto variante="etiqueta" color={c.confirmado} style={{ flex: 1 }}>{franja}</Texto>
        <Icono nombre="chevron-right" tamano={28} color={c.confirmado} />
      </Pressable>
      {aviso ? <Mensaje tono="aviso">{aviso}</Mensaje> : null}
      <Pressable accessibilityRole="button" onPress={() => router.push("/sos/cerca")} style={[estilos.franja, { backgroundColor: c.accionSuave }]}>
        <Icono nombre="radar" tamano={28} color={c.accionTexto} />
        <Texto variante="etiqueta" color={c.accionTexto} style={{ flex: 1 }}>Postas, bomberos y policía cerca (2 km)</Texto>
        <Icono nombre="chevron-right" tamano={28} color={c.accionTexto} />
      </Pressable>

      {pasos.length > 0 && !actual && !alguienViene ? (
        <>
          <Mensaje tono="aviso">Nadie contestó. Vuelve a intentarlo o pide ayuda a alguien que esté cerca.</Mensaje>
          <BotonPrincipal variante="emergencia" icono="refresh" onPress={() => setVueltaDemo((v) => v + 1)}>
            Volver a intentar
          </BotonPrincipal>
        </>
      ) : null}

      {pasos.map((p, k) => (
        <View key={p.id} style={estilos.bloque}>
          <TarjetaPaso numero={k + 1} paso={p} textoAhora={textoAhora} subtitulo={p.tipo === "comite" ? comite?.nombre : p.tipo === "salud" ? salud?.nombre : undefined} />
          {!esDemo && actual && k === i && fase === "pregunta" ? (
            <View style={estilos.fila}>
              <View style={{ flex: 1 }}>
                <BotonPrincipal variante="listo" onPress={() => responder(true)}>Viene</BotonPrincipal>
              </View>
              <View style={{ flex: 1 }}>
                <BotonPrincipal variante="neutro" onPress={() => responder(false)}>No contestó</BotonPrincipal>
              </View>
            </View>
          ) : null}
          {!esDemo && actual && k === i ? (
            <BotonPrincipal variante="secundario" icono="phone" onPress={() => void llamarActual(actual)}>
              {`Volver a llamar a ${actual.titulo}`}
            </BotonPrincipal>
          ) : null}
        </View>
      ))}
    </Pantalla>
  );
}

function TarjetaPaso({ numero, paso, textoAhora, subtitulo }: { numero: number; paso: PasoCascada; textoAhora: string; subtitulo?: string }) {
  const { tema } = useTema();
  const c = tema.colores;
  const apagado = paso.estado === "no_hizo_falta" || paso.estado === "espera";
  const verde = paso.estado === "viene";
  const ahora = paso.estado === "llamando";
  const colorNumero = verde ? c.confirmado : ahora ? c.peligro : apagado ? "#B5B0A6" : "#8C857A";
  const borde = verde ? c.confirmado : ahora ? c.peligro : c.borde;
  const estado = ahora ? textoAhora : textoEstado(paso.estado);
  return (
    <View
      accessible
      accessibilityLabel={`${numero}. ${paso.titulo}. ${estado}`}
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
        {subtitulo ? <Texto variante="ayuda">{subtitulo}</Texto> : null}
        <Texto variante="etiqueta" color={verde ? c.confirmado : ahora ? c.peligro : c.textoSecundario}>{estado}</Texto>
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
  bloque: { gap: 10 },
  fila: { flexDirection: "row", gap: 10 },
  enlace: { alignItems: "center", paddingVertical: 8 },
  subrayado: { textDecorationLine: "underline" },
});
