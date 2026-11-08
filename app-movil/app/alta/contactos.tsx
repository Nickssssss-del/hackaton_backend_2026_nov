/**
 * Vista. A5 · ¿A quién llamamos si te pasa algo? · Paso 3 de 3 (Mockup v4, p. 6).
 * - «Dime a quién llamamos»: la persona dice «Ana, mi hija»; se busca el número en la agenda.
 *   Si no está (o no hay permiso), se abre el formulario con el nombre ya escrito.
 * - «Escribir un número»: nombre y celular (9 dígitos, empieza en 9).
 * - Máximo 2 personas («Tus personas · N de 2»). Se pueden quitar.
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

  useEffect(() => {
    void leerContactos().then(setContactos);
  }, []);

  const lleno = contactos.length >= MAX_CONTACTOS;

  const actualizar = (lista: ContactoLocal[]) => {
    const ordenada = lista.map((contacto, i) => ({ ...contacto, orden: i + 1 }));
    setContactos(ordenada);
    void guardarContactos(ordenada);
  };

  const agregar = (nombre: string, telefono: string, relacion: string) => {
    if (contactos.length >= MAX_CONTACTOS) return;
    actualizar([...contactos, { nombre: nombre.trim(), telefono, relacion: relacion.trim(), orden: contactos.length + 1 }]);
    setFormulario(null);
    setMensaje(`${nombre.trim()} está en tu lista.`);
  };

  const alDictar = useCallback(
    async (texto: string) => {
      const { nombre, relacion } = interpretarContactoDictado(texto);
      setBuscando(true);
      const agenda = await buscarEnAgenda(nombre);
      setBuscando(false);
      if (agenda.estado === "encontrado") {
        if (contactos.some((item) => item.telefono === agenda.telefono)) {
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
    // «agregar» lee «contactos»: la función se recrea cuando cambia la lista.
    [contactos],
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
        : contactos.some((item) => item.telefono === celular)
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
      {!lleno && !formulario ? (
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
        </>
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
          <BotonPrincipal variante="neutro" onPress={() => { setFormulario(null); setMensaje(null); }}>
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
        return (
          <View key={persona.telefono} style={[estilos.persona, { backgroundColor: c.confirmadoSuave, borderColor: c.confirmado }]}>
            <View style={[estilos.numero, { backgroundColor: c.confirmado, borderColor: c.confirmado }]}>
              <Texto variante="etiqueta" color={c.sobreColor}>{i + 1}</Texto>
            </View>
            <View style={estilos.datos}>
              <Texto variante="etiqueta">{persona.nombre}{persona.relacion ? `, ${persona.relacion}` : ""}</Texto>
              <Texto variante="ayuda">{persona.telefono.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}</Texto>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar a ${persona.nombre}`}
              onPress={() => {
                actualizar(contactos.filter((_, j) => j !== i));
                setMensaje(null);
              }}
              style={[estilos.quitar, { borderColor: c.borde, backgroundColor: c.superficie }]}
            >
              <Icono nombre="close" color={c.texto} />
            </Pressable>
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
  persona: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, padding: 12, borderRadius: RADIO.l, borderWidth: 2 },
  numero: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  datos: { flex: 1 },
  quitar: {
    width: ALTO_TACTIL,
    height: ALTO_TACTIL,
    borderRadius: ALTO_TACTIL / 2,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
