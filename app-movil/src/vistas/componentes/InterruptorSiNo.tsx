/**
 * Vista. Interruptor del Mockup v4: el estado se lee con palabra y color.
 * "Sí" en verde con el círculo a la derecha; "No" en gris con el círculo a la izquierda.
 */
import { Pressable, StyleSheet, View } from "react-native";
import { ALTO_TACTIL, RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Texto } from "./Texto";

type Props = {
  etiqueta: string;
  valor: boolean;
  onCambiar: (valor: boolean) => void;
};

export function InterruptorSiNo({ etiqueta, valor, onCambiar }: Props) {
  const { tema } = useTema();
  const c = tema.colores;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: valor }}
      accessibilityLabel={`${etiqueta}: ${valor ? "Sí" : "No"}`}
      onPress={() => onCambiar(!valor)}
      style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}
    >
      <Texto variante="etiqueta" style={estilos.etiqueta}>{etiqueta}</Texto>
      <View style={[estilos.riel, { backgroundColor: valor ? c.confirmado : c.interruptorNo }, valor ? estilos.rielSi : estilos.rielNo]}>
        <View style={[estilos.perilla, { backgroundColor: c.sobreColor }]} />
        <Texto variante="etiqueta" color={c.sobreColor} maxFontSizeMultiplier={1}>
          {valor ? "Sí" : "No"}
        </Texto>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: ALTO_TACTIL + 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIO.m,
    borderWidth: 1.5,
  },
  etiqueta: { flex: 1 },
  riel: {
    alignItems: "center",
    gap: 8,
    minWidth: 84,
    minHeight: 40,
    paddingHorizontal: 6,
    borderRadius: RADIO.pastilla,
  },
  rielSi: { flexDirection: "row-reverse" },
  rielNo: { flexDirection: "row" },
  perilla: { width: 28, height: 28, borderRadius: 14 },
});
