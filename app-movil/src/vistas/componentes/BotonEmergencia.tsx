/**
 * Vista. Recibe la acción del controlador.
 * No importa clientes remotos.
 */
import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  onPulsar: () => void;
};

export function BotonEmergencia({ onPulsar }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Emergencia"
      onLongPress={onPulsar}
      delayLongPress={2000}
      style={estilos.boton}
    >
      <Text style={estilos.texto}>Emergencia</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D91023",
    paddingHorizontal: 18,
  },
  texto: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
