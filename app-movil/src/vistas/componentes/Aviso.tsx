import { StyleSheet, Text, View } from "react-native";

export function Aviso({ tipo, children }: { tipo: "amarillo" | "verde" | "azul"; children: string }) {
  const color = { amarillo: "#FFF1C2", verde: "#E5F4EA", azul: "#E5EEFC" }[tipo];
  return (
    <View style={[estilos.contenedor, { backgroundColor: color }]}>
      <Text style={estilos.texto}>{children}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 12, borderRadius: 8 },
  texto: { fontSize: 18, color: "#1B1B1B" },
});
