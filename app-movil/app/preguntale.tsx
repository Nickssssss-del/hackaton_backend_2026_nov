/**
 * Vista. D1 · Pregúntale a Vecinos (Mockup v4, p. 15).
 * La persona habla o escribe; la Edge Function `preguntale` responde con un texto corto (que se lee
 * en voz alta) y una sola acción: buscar un servicio, crear un recordatorio, ver el horario, pedir
 * ayuda, llamar o cómo llegar. Lo que crea algo se confirma con «¿Lo guardo?».
 * Sin internet o si no entiende: botones de siempre (Servicios, Pastillas, Ayuda).
 * La primera vez se pide consentimiento: lo dicho se envía a un servicio de inteligencia artificial.
 */
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { urlComoLlegarPreguntale, usePreguntale, type LlamadaPosible } from "../src/controladores/usePreguntale";
import { etiquetaOficio } from "../src/modelos/categoriasServicio";
import type { BotonPreguntale, RespuestaPreguntale, ServicioEncontrado } from "../src/modelos/preguntale";
import { BotonPrincipal } from "../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../src/vistas/componentes/CampoConVoz";
import { Icono } from "../src/vistas/componentes/Icono";
import { Mensaje } from "../src/vistas/componentes/Mensaje";
import { Pantalla } from "../src/vistas/componentes/Pantalla";
import { Texto } from "../src/vistas/componentes/Texto";
import { estiloOficio } from "../src/vistas/componentes/estiloCategoriaServicio";
import { colorIcono, RADIO } from "../src/vistas/tema/tokens";
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
  const [texto, setTexto] = useState("");

  if (p.aceptado === null) return null;

  if (!p.aceptado) {
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
        <View style={[estilos.circulo, { backgroundColor: colorIcono("turquesa", tema.oscuro).fondo }]}>
          <Icono nombre="robot-happy-outline" tamano={56} color={colorIcono("turquesa", tema.oscuro).icono} />
        </View>
        <Texto variante="subtitulo">Antes de empezar</Texto>
        <Texto>Para entenderte, lo que digas o escribas se envía a un servicio de inteligencia artificial.</Texto>
        <Mensaje tono="info">No se envían tu nombre, tu celular, tus contactos ni tus pastillas.</Mensaje>
        <Texto variante="ayuda" color={c.textoSecundario}>No digas datos personales, claves ni números de tarjeta.</Texto>
      </Pantalla>
    );
  }

  const textoEscuchar = p.respuesta
    ? p.respuesta.texto
    : "Pregúntale a Vecinos. Toca el micrófono y dime qué necesitas, o escríbelo. Por ejemplo: dónde compro pan cerca.";

  return (
    <Pantalla
      titulo="Pregúntale a Vecinos"
      volver
      textoEscuchar={textoEscuchar}
      pie={
        <BotonPrincipal
          variante="tocar"
          icono="send"
          cargando={p.cargando}
          motivoDesactivado={texto.trim() ? null : "Dime qué necesitas"}
          onPress={() => void p.enviar(texto)}
        >
          Preguntar
        </BotonPrincipal>
      }
    >
      <CampoConVoz etiqueta="¿Qué necesitas?" ayuda="Habla o escribe" valor={texto} onCambiar={setTexto} maxLength={300} />

      {!p.respuesta && !p.error ? (
        <View style={estilos.ejemplos}>
          <Texto variante="ayuda" color={c.textoSecundario}>Por ejemplo:</Texto>
          {EJEMPLOS.map((e) => (
            <Pressable
              key={e}
              accessibilityRole="button"
              accessibilityLabel={`Preguntar: ${e}`}
              onPress={() => {
                setTexto(e);
                void p.enviar(e);
              }}
              style={[estilos.ejemplo, { borderColor: c.borde, backgroundColor: c.superficie }]}
            >
              <Texto>{`«${e}»`}</Texto>
            </Pressable>
          ))}
        </View>
      ) : null}

      {p.error ? (
        <>
          <Mensaje tono="aviso">{p.error}</Mensaje>
          <BotonesBase />
        </>
      ) : null}

      {p.respuesta ? <Respuesta respuesta={p.respuesta} p={p} /> : null}
      {p.hecho ? <Mensaje tono="listo">{p.hecho}</Mensaje> : null}
    </Pantalla>
  );
}

function Respuesta({ respuesta, p }: { respuesta: RespuestaPreguntale; p: ReturnType<typeof usePreguntale> }) {
  const { tema } = useTema();
  const c = tema.colores;
  const [confirmado, setConfirmado] = useState<null | "si" | "no">(null);
  const [guardando, setGuardando] = useState(false);
  const [llamadas, setLlamadas] = useState<LlamadaPosible[] | null>(null);
  const { funcion, argumentos, servicios } = respuesta;
  const { resolverLlamada } = p;

  useEffect(() => {
    setConfirmado(null);
    setLlamadas(null);
    if (funcion === "llamar") void resolverLlamada(argumentos, servicios).then(setLlamadas);
  }, [respuesta, funcion, argumentos, servicios, resolverLlamada]);

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

  return (
    <View style={estilos.respuesta}>
      <View style={[estilos.burbuja, { backgroundColor: c.accionSuave, borderColor: c.accion }]}>
        <Icono nombre="robot-happy-outline" tamano={28} color={c.accionTexto} />
        <Texto style={{ flex: 1 }}>{respuesta.texto}</Texto>
        <Pressable accessibilityRole="button" accessibilityLabel="Escuchar otra vez" onPress={() => p.hablar(respuesta.texto)} hitSlop={10}>
          <Icono nombre="volume-high" tamano={28} color={c.accionTexto} />
        </Pressable>
      </View>

      {funcion === "buscar_servicio" && servicios.length > 0
        ? servicios.map((s) => <TarjetaEncontrado key={s.id} servicio={s} />)
        : null}

      {respuesta.confirmar && (funcion === "crear_recordatorio" || funcion === "pedir_ayuda") && confirmado === null ? (
        <View style={estilos.fila}>
          <BotonPrincipal estilo={estilos.mitad} variante="neutro" onPress={() => setConfirmado("no")}>
            No
          </BotonPrincipal>
          <BotonPrincipal estilo={estilos.mitad} variante="listo" icono="check" cargando={guardando} onPress={() => void guardar()}>
            Sí, guardar
          </BotonPrincipal>
        </View>
      ) : null}
      {confirmado === "no" ? <Mensaje tono="info">No guardé nada.</Mensaje> : null}

      {funcion === "ver_mi_horario" ? (
        <BotonPrincipal variante="tocar" icono="pill" onPress={() => router.push("/pastillas")}>
          Ver mi horario
        </BotonPrincipal>
      ) : null}

      {funcion === "llamar" && llamadas !== null ? (
        llamadas.length === 0 ? (
          <Mensaje tono="aviso">No encontré a quién llamar. Revisa tus contactos en Mis datos.</Mensaje>
        ) : (
          llamadas.map((l) => (
            <BotonPrincipal key={`${l.etiqueta}-${l.telefono}`} variante="listo" icono="phone" onPress={() => void Linking.openURL(`tel:${l.telefono}`)}>
              {l.etiqueta}
            </BotonPrincipal>
          ))
        )
      ) : null}

      {funcion === "como_llegar" ? (
        url ? (
          <BotonPrincipal variante="tocar" icono="map-marker-path" onPress={() => void Linking.openURL(url)}>
            Abrir el mapa
          </BotonPrincipal>
        ) : (
          <Mensaje tono="aviso">No sé a dónde quieres ir. Dímelo con más detalle.</Mensaje>
        )
      ) : null}

      <Botones botones={respuesta.botones} servicios={servicios} />
    </View>
  );
}

function TarjetaEncontrado({ servicio }: { servicio: ServicioEncontrado }) {
  const { tema } = useTema();
  const c = tema.colores;
  const estilo = estiloOficio(servicio.oficio);
  const tono = colorIcono(estilo.color, tema.oscuro);
  const partes = [
    etiquetaOficio(servicio.oficio),
    servicio.abiertoAhora === true ? "Abierto" : servicio.abiertoAhora === false ? "Cerrado" : null,
    servicio.vistosBuenosTotal > 0 ? `${servicio.vistosBuenosTotal} vistos buenos` : null,
  ].filter(Boolean);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${servicio.nombre}. ${partes.join(". ")}. Toca para ver más.`}
      onPress={() => router.push({ pathname: "/servicios/[id]", params: { id: servicio.id } })}
      style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}
    >
      <View style={[estilos.icono, { backgroundColor: tono.fondo }]}>
        <Icono nombre={estilo.icono} tamano={28} color={tono.icono} />
      </View>
      <View style={{ flex: 1 }}>
        <Texto variante="etiqueta">{servicio.nombre}</Texto>
        <Texto variante="ayuda" color={c.textoSecundario}>{partes.join(" · ")}</Texto>
      </View>
      <Icono nombre="chevron-right" tamano={28} color={c.textoSecundario} />
    </Pressable>
  );
}

/** Botones que devuelve la función: de llamar o cómo llegar a un negocio, o los de siempre. */
function Botones({ botones, servicios }: { botones: BotonPreguntale[]; servicios: ServicioEncontrado[] }) {
  if (botones.length === 0) return null;
  return (
    <View style={estilos.botones}>
      {botones.map((b) => {
        if (b.funcion === "llamar") {
          const s = servicios.find((x) => x.id === b.argumentos.servicio_id);
          if (!s?.contacto) return null;
          const tel = s.contacto;
          return (
            <BotonPrincipal key={b.etiqueta} variante="listo" icono="phone" onPress={() => void Linking.openURL(`tel:${tel}`)}>
              {b.etiqueta}
            </BotonPrincipal>
          );
        }
        if (b.funcion === "como_llegar") {
          const url = urlComoLlegarPreguntale(b.argumentos, servicios);
          if (!url) return null;
          return (
            <BotonPrincipal key={b.etiqueta} variante="secundario" icono="map-marker-path" onPress={() => void Linking.openURL(url)}>
              {b.etiqueta}
            </BotonPrincipal>
          );
        }
        const destino = DESTINO_BASE[b.etiqueta];
        if (!destino) return null;
        return (
          <BotonPrincipal key={b.etiqueta} variante="secundario" onPress={() => router.push(destino)}>
            {b.etiqueta}
          </BotonPrincipal>
        );
      })}
    </View>
  );
}

function BotonesBase() {
  return (
    <View style={estilos.botones}>
      {Object.entries(DESTINO_BASE).map(([etiqueta, destino]) => (
        <BotonPrincipal key={etiqueta} variante="secundario" onPress={() => router.push(destino)}>
          {etiqueta}
        </BotonPrincipal>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  circulo: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  ejemplos: { gap: 8 },
  ejemplo: { borderWidth: 1.5, borderRadius: RADIO.m, padding: 12 },
  respuesta: { gap: 12 },
  burbuja: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1.5, borderRadius: RADIO.l, padding: 14 },
  tarjeta: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: RADIO.l, padding: 12 },
  icono: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  fila: { flexDirection: "row", gap: 10 },
  mitad: { flex: 1 },
  botones: { gap: 8 },
});
