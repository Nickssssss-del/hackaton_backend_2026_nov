/**
 * Vista. Círculo de 150 px. No llama a servicios remotos.
 */
import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  escuchando: boolean;
  onPulsar: () => void;
};

export function BotonVoz({ escuchando, onPulsar }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={escuchando ? "Te escucho" : "Toca y habla"}
      onPress={onPulsar}
      style={[estilos.boton, escuchando ? estilos.activo : null]}
    >
      <Text style={estilos.texto}>{escuchando ? "Te escucho…" : "Toca y habla"}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A6B3C",
    padding: 12,
  },
  activo: {
    backgroundColor: "#1A6B3C",
  },
  texto: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
});
