/**
 * Vista. C1 · Horario de pastillas (Mockup v4, p. 12).
 * Tomas del día en orden de hora: tomada (verde), actual (amarilla), pendiente (blanca).
 * «Ya la tomé» marca la toma de hoy (tocar otra vez la desmarca). «Agregar pastilla» → C2.
 * (Sin «Demo: así te aviso», pedido del equipo.) «Probar el aviso en 10 segundos» manda un aviso real
 * del sistema (sirve para comprobar sonido y vibración, incluso con la app cerrada).
 */
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { probarAvisoEnDiezSegundos, quitarPastilla } from "../../src/controladores/recordatorios";
import {
  cantidadLegible,
  estadosDelDia,
  leerPastillas,
  leerTomadasHoy,
  marcarTomada,
  partesHora,
  type EstadoToma,
  type Pastilla,
} from "../../src/modelos/local/pastillas";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { ALTO_TACTIL, colorIcono, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

// Reloj con pastilla (imagen del equipo): decorativa, el lector de pantalla la omite.
const RELOJ_PASTILLA = require("../../assets/ilustraciones/reloj-pastilla.png");

export default function HorarioPastillas() {
  const { tema } = useTema();
  const c = tema.colores;
  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [tomadas, setTomadas] = useState<string[]>([]);
  const [porQuitar, setPorQuitar] = useState<string | null>(null);
  const [prueba, setPrueba] = useState<{ tono: "listo" | "aviso"; texto: string } | null>(null);

  const probar = async () => {
    if (!pastillas[0]) return;
    const r = await probarAvisoEnDiezSegundos(pastillas[0]);
    setPrueba(
      r === "concedido"
        ? { tono: "listo", texto: "En 10 segundos te llega un aviso de prueba. Puedes cerrar la app para probarlo." }
        : r === "denegado"
          ? { tono: "aviso", texto: "Sin permiso de avisos. Actívalo en Ajustes › Apps › Vecinos › Notificaciones." }
          : { tono: "aviso", texto: "Aquí no hay avisos (solo funcionan en el teléfono)." },
    );
  };

  const cargar = useCallback(async () => {
    const [lista, hoy] = await Promise.all([leerPastillas(), leerTomadasHoy()]);
    setPastillas(lista);
    setTomadas(hoy);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const estados = estadosDelDia(pastillas, tomadas);

  const alternar = async (p: Pastilla) => {
    await marcarTomada(p.id, !tomadas.includes(p.id));
    await cargar();
  };

  const quitar = async (id: string) => {
    await quitarPastilla(id);
    setPorQuitar(null);
    await cargar();
  };

  const textoEscuchar =
    pastillas.length === 0
      ? "Horario de pastillas. Aún no tienes pastillas. Toca Agregar pastilla."
      : `Horario de pastillas. ${pastillas
          .map((p) => {
            const h = partesHora(p.hora);
            return `${h.hora} ${h.periodo}, ${p.nombre}, ${cantidadLegible(p.cantidad)}, ${tomadas.includes(p.id) ? "ya la tomaste" : "pendiente"}`;
          })
          .join(". ")}.`;

  return (
    <Pantalla
      volver
      textoEscuchar={textoEscuchar}
      encabezado={
        <View style={estilos.cabecera}>
          <Texto variante="titulo" accessibilityRole="header" style={estilos.flex}>Horario de pastillas</Texto>
        </View>
      }
      pie={
        <>
          <BotonPrincipal icono="plus" onPress={() => router.push("/pastillas/nueva")}>Agregar pastilla</BotonPrincipal>
        </>
      }
    >
      {pastillas.length === 0 ? (
        <>
          <Image source={RELOJ_PASTILLA} style={estilos.relojGrande} resizeMode="contain" accessible={false} />
          <Mensaje tono="info">Aún no tienes pastillas. Toca «Agregar pastilla» para que te avise a la hora.</Mensaje>
        </>
      ) : null}
      {pastillas.length > 0 ? (
        <BotonPrincipal variante="secundario" icono="bell-ring-outline" onPress={() => void probar()}>
          Probar el aviso en 10 segundos
        </BotonPrincipal>
      ) : null}
      {prueba ? <Mensaje tono={prueba.tono}>{prueba.texto}</Mensaje> : null}
      {pastillas.map((p) => (
        <TarjetaToma
          key={p.id}
          pastilla={p}
          estado={estados[p.id]}
          onTomada={() => void alternar(p)}
          quitando={porQuitar === p.id}
          onQuitar={() => setPorQuitar(porQuitar === p.id ? null : p.id)}
          onConfirmarQuitar={() => void quitar(p.id)}
        />
      ))}
    </Pantalla>
  );
}

function TarjetaToma({
  pastilla,
  estado,
  onTomada,
  quitando,
  onQuitar,
  onConfirmarQuitar,
}: {
  pastilla: Pastilla;
  estado: EstadoToma;
  onTomada: () => void;
  quitando: boolean;
  onQuitar: () => void;
  onConfirmarQuitar: () => void;
}) {
  const { tema } = useTema();
  const c = tema.colores;
  const naranja = colorIcono("naranja", tema.oscuro);
  const h = partesHora(pastilla.hora);
  const fondo = estado === "tomada" ? c.confirmadoSuave : estado === "actual" ? c.aviso : c.superficie;
  const borde = estado === "tomada" ? c.confirmado : estado === "actual" ? c.avisoBorde : c.borde;
  const tomada = estado === "tomada";
  return (
    <View style={[estilos.tarjeta, { backgroundColor: fondo, borderColor: borde }]}>
      <View style={estilos.fila}>
        <View style={estilos.hora}>
          <Texto variante="titulo">{h.hora}</Texto>
          <Texto variante="ayuda">{h.periodo}</Texto>
        </View>
        <View style={estilos.flex}>
          <Texto variante="subtitulo">{pastilla.nombre}</Texto>
          <View style={estilos.cantidad}>
            <Icono nombre="pill" color={naranja.icono} tamano={20} />
            <Texto variante="etiqueta" color={naranja.icono}>{cantidadLegible(pastilla.cantidad)}</Texto>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${pastilla.nombre}`}
          onPress={onQuitar}
          hitSlop={6}
          style={estilos.quitar}
        >
          <Icono nombre="trash-can-outline" color={c.textoSecundario} tamano={24} />
        </Pressable>
      </View>
      {quitando ? (
        <View style={estilos.confirmar}>
          <Texto variante="etiqueta">¿Quitar {pastilla.nombre}? Ya no te avisaremos.</Texto>
          <View style={estilos.fila}>
            <BotonPrincipal variante="neutro" estilo={estilos.flex} onPress={onQuitar}>No</BotonPrincipal>
            <BotonPrincipal variante="emergencia" estilo={estilos.flex} onPress={onConfirmarQuitar}>Sí, quitar</BotonPrincipal>
          </View>
        </View>
      ) : (
        <BotonPrincipal
          variante={tomada ? "listo" : "secundarioListo"}
          icono={tomada ? "check" : undefined}
          onPress={onTomada}
          accessibilityHint={tomada ? "Toca para desmarcar" : undefined}
        >
          Ya la tomé
        </BotonPrincipal>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  relojGrande: { width: 180, height: 170, alignSelf: "center", marginVertical: 8 },
  cabecera: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  tarjeta: { borderRadius: RADIO.l, borderWidth: 2, padding: 14, gap: 12 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12 },
  hora: { minWidth: 76 },
  cantidad: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  quitar: { width: ALTO_TACTIL, height: ALTO_TACTIL, alignItems: "center", justifyContent: "center" },
  confirmar: { gap: 10 },
});
