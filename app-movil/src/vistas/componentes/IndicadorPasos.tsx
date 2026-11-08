/**
 * Vista. Progreso del registro: cuatro segmentos y "Paso N de 4" (RNF-05). Paso 4 = ¿Algo de esto te pasa?
 */
import { StyleSheet, View } from "react-native";
import { useTema } from "../tema/useTema";
import { Texto } from "./Texto";

export function IndicadorPasos({ paso, total = 4 }: { paso: number; total?: number }) {
  const { tema } = useTema();
  return (
    <View style={estilos.fila} accessible accessibilityLabel={`Paso ${paso} de ${total}`}>
      <View style={estilos.segmentos}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[estilos.segmento, { backgroundColor: i < paso ? tema.colores.accion : tema.colores.borde }]}
          />
        ))}
      </View>
      <Texto variante="etiqueta">Paso {paso} de {total}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: 12 },
  segmentos: { flex: 1, flexDirection: "row", gap: 6 },
  segmento: { flex: 1, height: 8, borderRadius: 4 },
});
