import { StyleSheet, View, type ViewProps } from "react-native";

export function Tarjeta(props: ViewProps) {
  return <View {...props} style={[estilos.tarjeta, props.style]} />;
}

const estilos = StyleSheet.create({
  tarjeta: { gap: 8, padding: 16, borderRadius: 12, backgroundColor: "#F4F1EA" },
});
