/**
 * Vista. A1 · Bienvenida a Vecinos (Mockup v4, p. 1).
 * Barra superior sin Volver. Leyenda de colores informativa (no táctil). Empezar → A2.
 */
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Ilustracion } from "../../src/vistas/componentes/Ilustracion";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { useTema } from "../../src/vistas/tema/useTema";

const LEYENDA = [
  { clave: "accion", etiqueta: "Tocar" },
  { clave: "confirmado", etiqueta: "Listo" },
  { clave: "avisoBorde", etiqueta: "Aviso" },
  { clave: "peligro", etiqueta: "Emergencia" },
] as const;

export default function Bienvenida() {
  const { tema } = useTema();
  return (
    <Pantalla
      textoEscuchar="Bienvenida a Vecinos. Tu barrio, más cerca. Azul es tocar, verde es listo, amarillo es aviso y rojo es emergencia. Toca Empezar."
      pie={<BotonPrincipal icono="chevron-right" onPress={() => router.push("/alta/modo")}>Empezar</BotonPrincipal>}
    >
      <Ilustracion tipo="barrio" alto={170} />
      <Texto variante="grande" accessibilityRole="header">Bienvenida a Vecinos</Texto>
      <Texto variante="ayuda">Tu barrio, más cerca.</Texto>
      <View style={estilos.leyenda} accessible accessibilityLabel="Colores: azul tocar, verde listo, amarillo aviso, rojo emergencia">
        {LEYENDA.map((item) => (
          <View
            key={item.clave}
            style={[
              estilos.item,
              // Cada color mide lo que su palabra (nunca se corta «Emergencia»); si no caben dos
              // por fila, baja a la siguiente. Con letra Enorme, uno por fila.
              { flexBasis: tema.tamano === "enorme" ? "100%" : "auto" },
              { backgroundColor: tema.colores.superficie, borderColor: tema.colores.borde },
            ]}
          >
            <View style={[estilos.punto, { backgroundColor: tema.colores[item.clave] }]} />
            <Texto variante="etiqueta" style={estilos.etiqueta}>{item.etiqueta}</Texto>
          </View>
        ))}
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  leyenda: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  item: {
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  punto: { width: 22, height: 22, borderRadius: 11, flexShrink: 0 },
  etiqueta: { flexShrink: 1 },
});
