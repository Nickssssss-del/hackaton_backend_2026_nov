/**
 * Vista. D1 · Pregúntale a Vecinos (Mockup v4, p. 15): un chat.
 * - Burbujas: lo que dice la persona (derecha, azul, con micrófono) y la respuesta de Vecinos
 *   (izquierda, con el robot), con sus botones: negocios, Cómo llegar, Llamar, Ver mi horario y
 *   «¿Lo guardo?» (Sí / No) para lo que crea algo.
 * - Abajo: teclado (cuadrado) y el botón grande «Toca y habla». Lo dicho se envía solo.
 * - La respuesta se lee en voz alta. Sin internet o si no entiende: Servicios, Pastillas y Ayuda.
 * - La primera vez se pide consentimiento: lo dicho se envía a un servicio de inteligencia artificial.
 * Llama a la Edge Function `preguntale` (usePreguntale). «Llamar» nunca marca sin un toque.
 */
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, TextInput, View } from "react-native";
import {
  urlComoLlegarPreguntale,
  usePreguntale,
  type LlamadaPosible,
  type MensajeChat,
} from "../src/controladores/usePreguntale";
import { useVoz } from "../src/controladores/useVoz";
import { etiquetaOficio } from "../src/modelos/categoriasServicio";
import type { BotonPreguntale, RespuestaPreguntale, ServicioEncontrado } from "../src/modelos/preguntale";
import { BotonPrincipal } from "../src/vistas/componentes/BotonPrincipal";
import { Icono, type NombreIcono } from "../src/vistas/componentes/Icono";
import { Mensaje } from "../src/vistas/componentes/Mensaje";
import { Pantalla } from "../src/vistas/componentes/Pantalla";
import { Texto } from "../src/vistas/componentes/Texto";
import { estiloOficio } from "../src/vistas/componentes/estiloCategoriaServicio";
import { ALTO_BOTON_PRINCIPAL, colorIcono, RADIO } from "../src/vistas/tema/tokens";
import { useTema } from "../src/vistas/tema/useTema";

const EJEMPLOS = ["¿Dónde compro pan cerca?", "Recuérdame mi pastilla a las 8 de la noche", "Quiero llamar a mi hija"];

const DESTINO_BASE: Record<string, Href> = {
  Servicios: "/servicios",
  Pastillas: "/pastillas",
  Ayuda: "/ayuda-vecinos",
};

export default function Preguntale() {
  const { tema } = useTema();
  const c = tema.colores;
  const p = usePreguntale();
  const [teclado, setTeclado] = useState(false);
  const [texto, setTexto] = useState("");
  const { enviar } = p;

  const alReconocer = useCallback((dicho: string) => void enviar(dicho), [enviar]);
  const voz = useVoz(alReconocer);

  // Sin reconocimiento de voz en el teléfono: el teclado queda abierto.
  const usarTeclado = teclado || voz.teclado || !voz.disponible;

  if (p.aceptado === null) return null;

  if (!p.aceptado) {
    const robot = colorIcono("turquesa", tema.oscuro);
    return (
      <Pantalla
        titulo="Pregúntale a Vecinos"
        volver
        textoEscuchar="Pregúntale a Vecinos. Para entenderte, lo que digas se envía a un servicio de inteligencia artificial. No se envían tu nombre, tu celular, tus contactos ni tus pastillas. ¿Aceptas?"
        pie={
          <>
            <BotonPrincipal variante="listo" icono="check" onPress={() => void p.aceptar()}>
              Acepto
            </BotonPrincipal>
            <BotonPrincipal variante="neutro" onPress={() => router.back()}>
              Ahora no
            </BotonPrincipal>
          </>
        }
      >
        <View style={[estilos.circuloGrande, { backgroundColor: robot.fondo }]}>
          <Icono nombre="robot-happy-outline" tamano={56} color={robot.icono} />
        </View>
        <Texto variante="subtitulo">Antes de empezar</Texto>
        <Texto>Para entenderte, lo que digas o escribas se envía a un servicio de inteligencia artificial.</Texto>
        <Mensaje tono="info">No se envían tu nombre, tu celular, tus contactos ni tus pastillas.</Mensaje>
        <Texto variante="ayuda" color={c.textoSecundario}>No digas datos personales, claves ni números de tarjeta.</Texto>
      </Pantalla>
    );
  }

  const ultima = [...p.mensajes].reverse().find((m) => m.de === "vecinos");
  const textoEscuchar = ultima
    ? ultima.texto
    : "Pregúntale a Vecinos. Toca el botón Toca y habla y dime qué necesitas. Por ejemplo: dónde compro pan cerca.";

  const enviarEscrito = () => {
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    void p.enviar(t);
  };

  return (
    <Pantalla
      volver
      textoEscuchar={textoEscuchar}
      encabezado={<Cabecera />}
      pie={
        <View style={estilos.barra}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={usarTeclado ? "Usar el micrófono" : "Escribir con el teclado"}
            onPress={() => setTeclado((t) => !t)}
            style={[estilos.botonTeclado, { borderColor: c.accion, backgroundColor: c.superficie }]}
          >
            <Icono nombre={usarTeclado && voz.disponible ? "microphone" : "keyboard-outline"} tamano={30} color={c.accionTexto} />
          </Pressable>
          {usarTeclado ? (
            <View style={estilos.escribir}>
              <TextInput
                value={texto}
                onChangeText={setTexto}
                placeholder="Escribe aquí"
                placeholderTextColor={c.textoSecundario}
                maxLength={300}
                onSubmitEditing={enviarEscrito}
                returnKeyType="send"
                accessibilityLabel="Escribe qué necesitas"
                style={[
                  estilos.campo,
                  { color: c.texto, borderColor: c.borde, backgroundColor: c.superficie, fontFamily: "AtkinsonHyperlegible_400Regular" },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enviar"
                disabled={!texto.trim() || p.cargando}
                onPress={enviarEscrito}
                style={[estilos.botonEnviar, { backgroundColor: texto.trim() ? c.accion : c.desactivado }]}
              >
                <Icono nombre="send" tamano={28} color={c.sobreColor} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={voz.escuchando ? "Escuchando. Toca para parar" : "Toca y habla"}
              onPress={() => void voz.alternar()}
              disabled={p.cargando}
              style={({ pressed }) => [
                estilos.tocaYHabla,
                { backgroundColor: voz.escuchando ? c.peligro : c.accion, opacity: pressed || p.cargando ? 0.85 : 1 },
              ]}
            >
              <Icono nombre={voz.escuchando ? "stop" : "microphone"} tamano={30} color={c.sobreColor} />
              <Texto variante="boton" color={c.sobreColor}>
                {p.cargando ? "Pensando…" : voz.escuchando ? "Te escucho…" : "Toca y habla"}
              </Texto>
            </Pressable>
          )}
        </View>
      }
    >
      <View style={estilos.chat}>
        {p.mensajes.length === 0 ? (
          <View style={estilos.ejemplos}>
            <Texto variante="ayuda" color={c.textoSecundario}>Puedes preguntarme, por ejemplo:</Texto>
            {EJEMPLOS.map((e) => (
              <Pressable
                key={e}
                accessibilityRole="button"
                accessibilityLabel={`Preguntar: ${e}`}
                onPress={() => void p.enviar(e)}
                style={[estilos.ejemplo, { borderColor: c.borde, backgroundColor: c.superficie }]}
              >
                <Icono nombre="microphone-outline" tamano={22} color={c.accionTexto} />
                <Texto style={{ flex: 1 }}>{e}</Texto>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Las últimas 6 burbujas: así lo nuevo siempre queda a la vista, sin desplazar. */}
        {p.mensajes.length > 6 ? <Texto variante="ayuda" color={c.textoSecundario} centrado>…</Texto> : null}
        {p.mensajes.slice(-6).map((m) =>
          m.de === "yo" ? (
            <BurbujaMia key={m.id} texto={m.texto} />
          ) : (
            <BurbujaVecinos key={m.id} mensaje={m} p={p} esLaUltima={m.id === p.mensajes[p.mensajes.length - 1]?.id} />
          ),
        )}
        {p.cargando ? <Texto variante="ayuda" color={c.textoSecundario}>Vecinos está pensando…</Texto> : null}
      </View>
    </Pantalla>
  );
}

function Cabecera() {
  const { tema } = useTema();
  const robot = colorIcono("turquesa", tema.oscuro);
  return (
    <View style={estilos.cabecera}>
      <View style={[estilos.circulo, { backgroundColor: robot.fondo }]}>
        <Icono nombre="robot-happy-outline" tamano={30} color={robot.icono} />
      </View>
      <Texto variante="titulo" accessibilityRole="header">Pregúntale a Vecinos</Texto>
    </View>
  );
}

function BurbujaMia({ texto }: { texto: string }) {
  const { tema } = useTema();
  const c = tema.colores;
  return (
    <View style={[estilos.burbujaMia, { backgroundColor: c.accion }]} accessible accessibilityLabel={`Tú: ${texto}`}>
      <Icono nombre="microphone-outline" tamano={22} color={c.sobreColor} />
      <Texto color={c.sobreColor} style={{ flexShrink: 1 }}>{texto}</Texto>
    </View>
  );
}

function BurbujaVecinos({
  mensaje,
  p,
  esLaUltima,
}: {
  mensaje: MensajeChat;
  p: ReturnType<typeof usePreguntale>;
  esLaUltima: boolean;
}) {
  const { tema } = useTema();
  const c = tema.colores;
  const robot = colorIcono("turquesa", tema.oscuro);
  return (
    <View style={estilos.filaVecinos}>
      <View style={[estilos.robotChico, { backgroundColor: robot.fondo }]}>
        <Icono nombre="robot-happy-outline" tamano={22} color={robot.icono} />
      </View>
      <View style={[estilos.burbujaVecinos, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Vecinos: ${mensaje.texto}. Toca para escuchar otra vez.`} onPress={() => p.hablar(mensaje.texto)}>
          <Texto>{mensaje.texto}</Texto>
        </Pressable>
        {mensaje.respuesta ? <Acciones respuesta={mensaje.respuesta} p={p} activa={esLaUltima} /> : null}
        {mensaje.conBotonesBase ? <BotonesBase /> : null}
      </View>
    </View>
  );
}

function Acciones({ respuesta, p, activa }: { respuesta: RespuestaPreguntale; p: ReturnType<typeof usePreguntale>; activa: boolean }) {
  const [confirmado, setConfirmado] = useState<null | "si" | "no">(null);
  const [guardando, setGuardando] = useState(false);
  const [llamadas, setLlamadas] = useState<LlamadaPosible[] | null>(null);
  const { funcion, argumentos, servicios } = respuesta;
  const { resolverLlamada } = p;

  useEffect(() => {
    if (funcion === "llamar") void resolverLlamada(argumentos, servicios).then(setLlamadas);
  }, [funcion, argumentos, servicios, resolverLlamada]);

  const guardar = async () => {
    setGuardando(true);
    if (funcion === "crear_recordatorio") {
      if (await p.guardarRecordatorio(argumentos)) setConfirmado("si");
    } else if (funcion === "pedir_ayuda") {
      const r = await p.guardarPedido(argumentos);
      if (r === "ok") setConfirmado("si");
      if (r === "celular") router.push("/perfil/celular");
    }
    setGuardando(false);
  };

  const url = funcion === "como_llegar" ? urlComoLlegarPreguntale(argumentos, servicios) : null;
  const pideConfirmar = respuesta.confirmar && (funcion === "crear_recordatorio" || funcion === "pedir_ayuda");

  return (
    <View style={estilos.acciones}>
      {funcion === "buscar_servicio" ? servicios.map((s) => <TarjetaEncontrado key={s.id} servicio={s} />) : null}

      {pideConfirmar && confirmado === null && activa ? (
        <View style={estilos.fila}>
          <BotonChico icono="close" texto="No" secundario onPress={() => setConfirmado("no")} />
          <BotonChico icono="check" texto={guardando ? "…" : "Sí, guárdalo"} onPress={() => void guardar()} />
        </View>
      ) : null}
      {confirmado === "no" ? <Texto variante="ayuda">No guardé nada.</Texto> : null}

      {funcion === "ver_mi_horario" ? <BotonChico icono="pill" texto="Ver mi horario" onPress={() => router.push("/pastillas")} /> : null}

      {funcion === "llamar" && llamadas !== null
        ? llamadas.length === 0
          ? <Texto variante="ayuda">No encontré a quién llamar. Revisa tus contactos en Mis datos.</Texto>
          : llamadas.map((l) => (
              <BotonChico key={`${l.etiqueta}-${l.telefono}`} icono="phone-outline" texto={l.etiqueta} onPress={() => void Linking.openURL(`tel:${l.telefono}`)} />
            ))
        : null}

      {funcion === "como_llegar" ? (
        url ? <BotonChico icono="map-marker-outline" texto="Cómo llegar" onPress={() => void Linking.openURL(url)} /> : <Texto variante="ayuda">No sé a dónde quieres ir. Dímelo con más detalle.</Texto>
      ) : null}

      <Botones botones={respuesta.botones} servicios={servicios} />
    </View>
  );
}

/** Tarjeta de un negocio encontrado, con «Cómo llegar» y «Llamar» como en el mockup. */
function TarjetaEncontrado({ servicio }: { servicio: ServicioEncontrado }) {
  const { tema } = useTema();
  const c = tema.colores;
  const estilo = estiloOficio(servicio.oficio);
  const tono = colorIcono(estilo.color, tema.oscuro);
  const partes = [
    etiquetaOficio(servicio.oficio),
    servicio.abiertoAhora === true ? "Abierto" : servicio.abiertoAhora === false ? "Cerrado" : null,
  ].filter(Boolean);
  const url = servicio.lat !== null && servicio.lng !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${servicio.lat},${servicio.lng}&travelmode=walking`
    : null;
  return (
    <View style={[estilos.tarjeta, { borderColor: c.borde }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${servicio.nombre}. ${partes.join(". ")}. Toca para ver más.`}
        onPress={() => router.push({ pathname: "/servicios/[id]", params: { id: servicio.id } })}
        style={estilos.filaTarjeta}
      >
        <View style={[estilos.circulo, { backgroundColor: tono.fondo }]}>
          <Icono nombre={estilo.icono} tamano={24} color={tono.icono} />
        </View>
        <View style={{ flex: 1 }}>
          <Texto variante="etiqueta">{servicio.nombre}</Texto>
          <Texto variante="ayuda" color={c.textoSecundario}>{partes.join(" · ")}</Texto>
        </View>
      </Pressable>
      <View style={estilos.fila}>
        {url ? <BotonChico icono="map-marker-outline" texto="Cómo llegar" onPress={() => void Linking.openURL(url)} /> : null}
        {servicio.contacto ? <BotonChico icono="phone-outline" texto="Llamar" onPress={() => void Linking.openURL(`tel:${servicio.contacto}`)} /> : null}
      </View>
    </View>
  );
}

/** Botones que devuelve la función (los de siempre: Servicios, Pastillas, Ayuda). */
function Botones({ botones, servicios }: { botones: BotonPreguntale[]; servicios: ServicioEncontrado[] }) {
  // Llamar / Cómo llegar de un negocio ya están en su tarjeta; aquí solo los de navegación.
  const base = botones.filter((b) => b.funcion === null && DESTINO_BASE[b.etiqueta]);
  void servicios;
  if (base.length === 0) return null;
  return (
    <View style={estilos.fila}>
      {base.map((b) => (
        <BotonChico key={b.etiqueta} texto={b.etiqueta} secundario onPress={() => router.push(DESTINO_BASE[b.etiqueta])} />
      ))}
    </View>
  );
}

function BotonesBase() {
  return (
    <View style={estilos.fila}>
      {Object.entries(DESTINO_BASE).map(([etiqueta, destino]) => (
        <BotonChico key={etiqueta} texto={etiqueta} secundario onPress={() => router.push(destino)} />
      ))}
    </View>
  );
}

/** Botón azul de la burbuja (Mockup v4: «Cómo llegar», «Llamar», «Ver mi horario»). */
function BotonChico({ icono, texto, onPress, secundario }: { icono?: NombreIcono; texto: string; onPress: () => void; secundario?: boolean }) {
  const { tema } = useTema();
  const c = tema.colores;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.botonChico,
        secundario ? { backgroundColor: c.superficie, borderColor: c.accion, borderWidth: 2 } : { backgroundColor: c.accion },
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {icono ? <Icono nombre={icono} tamano={22} color={secundario ? c.accionTexto : c.sobreColor} /> : null}
      <Texto variante="etiqueta" color={secundario ? c.accionTexto : c.sobreColor} style={{ flexShrink: 1 }}>{texto}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: "row", alignItems: "center", gap: 12 },
  circuloGrande: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  circulo: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  chat: { gap: 14 },
  ejemplos: { gap: 8 },
  ejemplo: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: RADIO.m, padding: 12 },
  burbujaMia: { alignSelf: "flex-end", maxWidth: "88%", flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: RADIO.l, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  filaVecinos: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  robotChico: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  burbujaVecinos: { flex: 1, borderWidth: 1.5, borderRadius: RADIO.l, borderBottomLeftRadius: 6, padding: 12, gap: 10 },
  acciones: { gap: 8 },
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tarjeta: { borderWidth: 1, borderRadius: RADIO.m, padding: 10, gap: 8 },
  filaTarjeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  botonChico: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 52, paddingHorizontal: 12, borderRadius: RADIO.m },
  barra: { flexDirection: "row", alignItems: "center", gap: 10 },
  botonTeclado: { width: ALTO_BOTON_PRINCIPAL, height: ALTO_BOTON_PRINCIPAL, borderRadius: RADIO.m, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tocaYHabla: { flex: 1, minHeight: ALTO_BOTON_PRINCIPAL, borderRadius: RADIO.m, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  escribir: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  campo: { flex: 1, minHeight: ALTO_BOTON_PRINCIPAL, borderWidth: 2, borderRadius: RADIO.m, paddingHorizontal: 12, fontSize: 20 },
  botonEnviar: { width: ALTO_BOTON_PRINCIPAL, height: ALTO_BOTON_PRINCIPAL, borderRadius: RADIO.m, alignItems: "center", justifyContent: "center" },
});
