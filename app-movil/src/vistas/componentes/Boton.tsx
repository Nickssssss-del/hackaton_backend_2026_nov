import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { useTema } from "../tema/useTema";

type Props = {
  children: string;
  variante?: "accion" | "confirmar" | "secundario" | "peligro";
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Boton({ children, variante = "accion", onPress, disabled, style }: Props) {
  const { tema } = useTema();
  const fondo = {
    accion: tema.colores.accion,
    confirmar: tema.colores.confirmado,
    secundario: tema.colores.superficie,
    peligro: tema.colores.peligro,
  }[variante];
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[estilos.boton, { backgroundColor: fondo }, style]}>
      <Text style={[estilos.texto, { color: variante === "secundario" ? tema.colores.texto : "#FFFFFF" }]}>
        {children}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: { minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  texto: { fontSize: 18, fontWeight: "700" },
});
