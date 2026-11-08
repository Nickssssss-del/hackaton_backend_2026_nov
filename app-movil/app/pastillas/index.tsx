/**
 * Vista. C1 · Horario de pastillas (Mockup v4, p. 12).
 * Tomas del día en orden de hora: tomada (verde), actual (amarilla), pendiente (blanca).
 * «Ya la tomé» marca la toma de hoy (tocar otra vez la desmarca). «Agregar pastilla» → C2.
 * «Demo: así te aviso» → C3 de demostración.
 */
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { quitarPastilla } from "../../src/controladores/recordatorios";
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

export default function HorarioPastillas() {
  const { tema } = useTema();
  const c = tema.colores;
  const naranja = colorIcono("naranja", tema.oscuro);
  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [tomadas, setTomadas] = useState<string[]>([]);
  const [porQuitar, setPorQuitar] = useState<string | null>(null);

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
          <View style={[estilos.campana, { backgroundColor: naranja.fondo }]}>
            <Icono nombre="bell-outline" color={naranja.icono} tamano={26} />
          </View>
          <Texto variante="titulo" accessibilityRole="header" style={estilos.flex}>Horario de pastillas</Texto>
        </View>
      }
      pie={
        <>
          <BotonPrincipal icono="plus" onPress={() => router.push("/pastillas/nueva")}>Agregar pastilla</BotonPrincipal>
          {pastillas.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Demo: así te aviso"
              onPress={() => router.push({ pathname: "/pastillas/aviso", params: { id: pastillas[0].id, demo: "1" } })}
              style={[estilos.demo, { borderColor: c.textoSecundario }]}
            >
              <Texto variante="etiqueta" color={c.textoSecundario}>Demo: así te aviso</Texto>
            </Pressable>
          ) : null}
        </>
      }
    >
      {pastillas.length === 0 ? (
        <Mensaje tono="info">Aún no tienes pastillas. Toca «Agregar pastilla» para que te avise a la hora.</Mensaje>
      ) : null}
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
  cabecera: { flexDirection: "row", alignItems: "center", gap: 12 },
  campana: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  tarjeta: { borderRadius: RADIO.l, borderWidth: 2, padding: 14, gap: 12 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12 },
  hora: { minWidth: 76 },
  cantidad: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  quitar: { width: ALTO_TACTIL, height: ALTO_TACTIL, alignItems: "center", justifyContent: "center" },
  confirmar: { gap: 10 },
  demo: {
    minHeight: ALTO_TACTIL,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: RADIO.m,
    alignItems: "center",
    justifyContent: "center",
  },
});
