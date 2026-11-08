/**
 * Vista. A5 · ¿A quién llamamos si te pasa algo? · Paso 3 de 3 (Mockup v4, p. 6).
 * - «Dime a quién llamamos»: la persona dice «Ana, mi hija»; se busca el número en la agenda.
 *   Si no está (o no hay permiso), se abre el formulario con el nombre ya escrito.
 * - «Escribir un número»: nombre y celular (9 dígitos, empieza en 9).
 * - «Elegir de mi agenda»: lista de la agenda con buscador; se toca la persona y queda elegida.
 * - Máximo 2 personas («Tus personas · N de 2»). Cada una tiene «Cambiar» (la reemplaza por otra)
 *   y «Quitar» (con «Deshacer» por si fue un error).
 * - «Avisarles cuando salgo de casa»: empieza en No y solo se guarda la elección de la persona
 *   (el aviso con GPS en segundo plano aún no está construido; INC-07).
 * Contactos y preferencia: solo en el teléfono.
 */
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferencias } from "../../src/controladores/PreferenciasContexto";
import {
  buscarEnAgenda,
  guardarContactos,
  listarAgenda,
  interpretarContactoDictado,
  leerContactos,
  MAX_CONTACTOS,
  normalizarCelular,
} from "../../src/controladores/registroVecinos";
import { useVoz } from "../../src/controladores/useVoz";
import type { ContactoLocal } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { Icono } from "../../src/vistas/componentes/Icono";
import { IndicadorPasos } from "../../src/vistas/componentes/IndicadorPasos";
import { InterruptorSiNo } from "../../src/vistas/componentes/InterruptorSiNo";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { TarjetaAcceso } from "../../src/vistas/componentes/TarjetaAcceso";
import { Texto } from "../../src/vistas/componentes/Texto";
import { ALTO_TACTIL, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

type Formulario = { nombre: string; relacion: string; telefono: string };

export default function AQuienLlamamos() {
  const { tema } = useTema();
  const c = tema.colores;
  const { avisarAlSalir, setAvisarAlSalir } = usePreferencias();
  // Desde Mis datos (B3) se reutiliza esta pantalla para editar (INC-29).
  const editando = useLocalSearchParams<{ editar?: string }>().editar === "1";
  const [contactos, setContactos] = useState<ContactoLocal[]>([]);
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  // Índice de la persona que se está cambiando (null: se agrega una nueva).
  const [reemplazar, setReemplazar] = useState<number | null>(null);
  const [quitada, setQuitada] = useState<{ persona: ContactoLocal; indice: number } | null>(null);
  const [agenda, setAgenda] = useState<{ nombre: string; telefono: string }[] | null>(null);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    void leerContactos().then(setContactos);
  }, []);

  const lleno = contactos.length >= MAX_CONTACTOS && reemplazar === null;

  const actualizar = (lista: ContactoLocal[]) => {
    const ordenada = lista.map((contacto, i) => ({ ...contacto, orden: i + 1 }));
    setContactos(ordenada);
    void guardarContactos(ordenada);
  };

  const agregar = (nombre: string, telefono: string, relacion: string) => {
    const nuevo = { nombre: nombre.trim(), telefono, relacion: relacion.trim(), orden: 0 };
    if (reemplazar !== null) {
      const anterior = contactos[reemplazar];
      actualizar(contactos.map((x, j) => (j === reemplazar ? nuevo : x)));
      setMensaje(`Listo: ${nuevo.nombre} en lugar de ${anterior?.nombre ?? "la persona anterior"}.`);
    } else {
      if (contactos.length >= MAX_CONTACTOS) return;
      actualizar([...contactos, nuevo]);
      setMensaje(`${nuevo.nombre} está en tu lista.`);
    }
    setReemplazar(null);
    setFormulario(null);
    setAgenda(null);
    setFiltro("");
    setQuitada(null);
  };

  const yaEsta = (telefono: string) => contactos.some((x, j) => x.telefono === telefono && j !== reemplazar);

  const abrirAgenda = async () => {
    setMensaje(null);
    setBuscando(true);
    const r = await listarAgenda();
    setBuscando(false);
    if (r.estado === "sin_permiso") {
      setMensaje("No pude abrir tu agenda. Escribe el número o dímelo con tu voz.");
      return;
    }
    setFormulario(null);
    setAgenda(r.contactos);
  };

  const cancelarEleccion = () => {
    setFormulario(null);
    setAgenda(null);
    setFiltro("");
    setReemplazar(null);
    setMensaje(null);
  };

  const quitar = (i: number) => {
    setQuitada({ persona: contactos[i], indice: i });
    actualizar(contactos.filter((_, j) => j !== i));
    setReemplazar(null);
    setMensaje(null);
  };

  const deshacer = () => {
    if (!quitada) return;
    const lista = [...contactos];
    lista.splice(Math.min(quitada.indice, lista.length), 0, quitada.persona);
    actualizar(lista.slice(0, MAX_CONTACTOS));
    setQuitada(null);
  };

  const alDictar = useCallback(
    async (texto: string) => {
      const { nombre, relacion } = interpretarContactoDictado(texto);
      setBuscando(true);
      const agenda = await buscarEnAgenda(nombre);
      setBuscando(false);
      if (agenda.estado === "encontrado") {
        if (yaEsta(agenda.telefono)) {
          setMensaje(`${agenda.nombre} ya está en tu lista.`);
          return;
        }
        agregar(agenda.nombre, agenda.telefono, relacion);
        return;
      }
      setFormulario({ nombre, relacion, telefono: "" });
      setMensaje(
        agenda.estado === "sin_permiso"
          ? `Escribe el número de ${nombre || "esa persona"}.`
          : `No encontré a ${nombre || "esa persona"} en tu agenda. Escribe su número.`,
      );
    },
    // «agregar» lee «contactos» y «reemplazar»: la función se recrea cuando cambian.
    [contactos, reemplazar],
  );
  const voz = useVoz(alDictar);

  const dictar = () => {
    setMensaje(null);
    if (!voz.disponible) {
      setFormulario({ nombre: "", relacion: "", telefono: "" });
      setMensaje("Aquí no hay micrófono. Escribe el nombre y el número.");
      return;
    }
    void voz.alternar();
  };

  const celular = formulario ? normalizarCelular(formulario.telefono) : null;
  const motivoAgregar = !formulario
    ? null
    : formulario.nombre.trim().length < 2
      ? "Falta el nombre"
      : !celular
        ? "El número tiene 9 dígitos y empieza en 9"
        : yaEsta(celular)
          ? "Ese número ya está en tu lista"
          : null;

  return (
    <Pantalla
      titulo={editando ? "Mis contactos" : "¿A quién llamamos si te pasa algo?"}
      volver
      encabezado={editando ? undefined : <IndicadorPasos paso={3} />}
      textoEscuchar={`${editando ? "Mis contactos." : "Paso 3 de 3."} ¿A quién llamamos si te pasa algo? Toca Dime a quién llamamos y di, por ejemplo, Ana, mi hija. O toca Escribir un número. Tienes ${contactos.length} de 2 personas.`}
      pie={
        <BotonPrincipal
          variante="listo"
          icono="check"
          onPress={() => (editando ? router.back() : router.push("/alta/listo"))}
        >
          {editando ? "Guardar" : "Listo"}
        </BotonPrincipal>
      }
    >
      {reemplazar !== null ? (
        <Mensaje tono="info">{`Elige a quién pones en lugar de ${contactos[reemplazar]?.nombre ?? "esa persona"}.`}</Mensaje>
      ) : null}
      {quitada ? (
        <View style={[estilos.deshacer, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <Texto style={{ flex: 1 }}>{`Quitaste a ${quitada.persona.nombre}.`}</Texto>
          <Pressable accessibilityRole="button" onPress={deshacer} style={[estilos.botonChico, { borderColor: c.accion }]}>
            <Texto variante="etiqueta" color={c.accionTexto}>Deshacer</Texto>
          </Pressable>
        </View>
      ) : null}

      {!lleno && !formulario && !agenda ? (
        <>
          <TarjetaAcceso
            tono="tocarSuave"
            icono="microphone"
            titulo={voz.escuchando ? "Te escucho…" : buscando ? "Buscando en tu agenda…" : "Dime a quién llamamos"}
            subtitulo='Di: "Ana, mi hija"'
            accion="ninguna"
            seleccionada={voz.escuchando}
            onPress={dictar}
          />
          <BotonPrincipal variante="secundario" icono="account-box-outline" onPress={() => void abrirAgenda()}>
            Elegir de mi agenda
          </BotonPrincipal>
          <BotonPrincipal
            variante="secundario"
            icono="keyboard-outline"
            onPress={() => {
              setMensaje(null);
              setFormulario({ nombre: "", relacion: "", telefono: "" });
            }}
          >
            Escribir un número
          </BotonPrincipal>
          {reemplazar !== null ? (
            <BotonPrincipal variante="neutro" onPress={cancelarEleccion}>
              No cambiar
            </BotonPrincipal>
          ) : null}
        </>
      ) : null}

      {agenda ? (
        <View style={[estilos.formulario, { borderColor: c.accion, backgroundColor: c.superficie }]}>
          <CampoConVoz etiqueta="Buscar en mi agenda" ayuda="Ana" valor={filtro} onCambiar={setFiltro} maxLength={40} />
          {agenda.length === 0 ? <Texto variante="ayuda">Tu agenda no tiene celulares de 9 dígitos.</Texto> : null}
          {agenda
            .filter((x) => x.nombre.toLowerCase().includes(filtro.trim().toLowerCase()))
            .slice(0, 40)
            .map((x) => {
              const repetido = yaEsta(x.telefono);
              return (
                <Pressable
                  key={x.telefono}
                  accessibilityRole="button"
                  accessibilityLabel={repetido ? `${x.nombre}, ya está en tu lista` : `Elegir a ${x.nombre}`}
                  disabled={repetido}
                  onPress={() => agregar(x.nombre, x.telefono, "")}
                  style={({ pressed }) => [
                    estilos.filaAgenda,
                    { borderColor: c.borde, backgroundColor: pressed ? c.accionSuave : c.fondo, opacity: repetido ? 0.5 : 1 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Texto variante="etiqueta">{x.nombre}</Texto>
                    <Texto variante="ayuda">{repetido ? "Ya está en tu lista" : x.telefono.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}</Texto>
                  </View>
                  {repetido ? null : <Icono nombre="plus-circle-outline" color={c.accionTexto} />}
                </Pressable>
              );
            })}
          <BotonPrincipal variante="neutro" onPress={cancelarEleccion}>
            Cancelar
          </BotonPrincipal>
        </View>
      ) : null}

      {mensaje ? <Mensaje tono={formulario ? "aviso" : "listo"}>{mensaje}</Mensaje> : null}

      {formulario ? (
        <View style={[estilos.formulario, { borderColor: c.accion, backgroundColor: c.superficie }]}>
          <CampoConVoz
            etiqueta="Nombre"
            ayuda="Ana"
            valor={formulario.nombre}
            onCambiar={(nombre) => setFormulario({ ...formulario, nombre })}
            maxLength={40}
            completo={formulario.nombre.trim().length >= 2}
          />
          <CampoConVoz
            etiqueta="Celular"
            ayuda="987 654 321"
            teclado="phone-pad"
            valor={formulario.telefono}
            onCambiar={(telefono) => setFormulario({ ...formulario, telefono })}
            maxLength={15}
            completo={Boolean(celular)}
          />
          <BotonPrincipal
            variante="listo"
            icono="account-plus-outline"
            motivoDesactivado={motivoAgregar}
            onPress={() => celular && agregar(formulario.nombre, celular, formulario.relacion)}
          >
            Agregar
          </BotonPrincipal>
          <BotonPrincipal variante="neutro" onPress={cancelarEleccion}>
            Cancelar
          </BotonPrincipal>
        </View>
      ) : null}

      <Texto variante="etiqueta">Tus personas · {contactos.length} de {MAX_CONTACTOS}</Texto>
      {Array.from({ length: MAX_CONTACTOS }, (_, i) => {
        const persona = contactos[i];
        if (!persona) {
          return (
            <View key={i} style={[estilos.hueco, { borderColor: c.borde }]}>
              <View style={[estilos.numero, { borderColor: c.borde }]}>
                <Texto variante="etiqueta" color={c.textoSecundario}>{i + 1}</Texto>
              </View>
              <Texto color={c.textoSecundario}>Persona {i + 1}</Texto>
            </View>
          );
        }
        const cambiando = reemplazar === i;
        return (
          <View
            key={persona.telefono}
            style={[estilos.persona, { backgroundColor: c.confirmadoSuave, borderColor: cambiando ? c.accion : c.confirmado }]}
          >
            <View style={estilos.filaPersona}>
              <View style={[estilos.numero, { backgroundColor: c.confirmado, borderColor: c.confirmado }]}>
                <Texto variante="etiqueta" color={c.sobreColor}>{i + 1}</Texto>
              </View>
              <View style={estilos.datos}>
                <Texto variante="etiqueta">{persona.nombre}{persona.relacion ? `, ${persona.relacion}` : ""}</Texto>
                <Texto variante="ayuda">{persona.telefono.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}</Texto>
              </View>
            </View>
            <View style={estilos.filaBotones}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Cambiar a ${persona.nombre} por otra persona`}
                onPress={() => {
                  setFormulario(null);
                  setAgenda(null);
                  setQuitada(null);
                  setMensaje(null);
                  setReemplazar(cambiando ? null : i);
                }}
                style={[estilos.botonChico, { borderColor: c.accion, backgroundColor: c.superficie, flex: 1 }]}
              >
                <Icono nombre="swap-horizontal" color={c.accionTexto} />
                <Texto variante="etiqueta" color={c.accionTexto}>{cambiando ? "Cancelar" : "Cambiar"}</Texto>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar a ${persona.nombre}`}
                onPress={() => quitar(i)}
                style={[estilos.botonChico, { borderColor: c.peligro, backgroundColor: c.superficie, flex: 1 }]}
              >
                <Icono nombre="close" color={c.peligro} />
                <Texto variante="etiqueta" color={c.peligro}>Quitar</Texto>
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* En Mis datos este interruptor ya está como «Avisar si salgo de casa». */}
      {editando ? null : (
        <>
          <InterruptorSiNo etiqueta="Avisarles cuando salgo de casa" valor={avisarAlSalir} onCambiar={setAvisarAlSalir} />
          {avisarAlSalir ? <Texto variante="ayuda">Guardamos tu elección. El aviso llegará en una próxima versión.</Texto> : null}
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  formulario: { gap: 12, padding: 12, borderRadius: RADIO.l, borderWidth: 2 },
  hueco: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    padding: 12,
    borderRadius: RADIO.l,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  persona: { gap: 10, padding: 12, borderRadius: RADIO.l, borderWidth: 2 },
  filaPersona: { flexDirection: "row", alignItems: "center", gap: 12 },
  filaBotones: { flexDirection: "row", gap: 10 },
  botonChico: {
    minHeight: ALTO_TACTIL,
    borderRadius: RADIO.m,
    borderWidth: 2,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deshacer: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: RADIO.l, borderWidth: 1.5 },
  filaAgenda: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: ALTO_TACTIL, padding: 10, borderRadius: RADIO.m, borderWidth: 1 },
  numero: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  datos: { flex: 1 },
});
