/**
 * Vista. Recibe la acción del controlador.
 * No importa el cliente de Supabase.
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
      onPress={onPulsar}
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
    backgroundColor: "#8c2f2f",
    paddingHorizontal: 18,
  },
  texto: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});
