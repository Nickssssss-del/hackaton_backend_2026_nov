import { Pressable, StyleSheet, Text, View } from "react-native";

export function Encabezado({ onVolver, escuchar }: { onVolver: () => void; escuchar?: () => void }) {
  return (
    <View style={estilos.fila}>
      <Pressable onPress={onVolver} style={estilos.boton}>
        <Text style={estilos.texto}>← Volver</Text>
      </Pressable>
      {escuchar ? (
        <Pressable onPress={escuchar} style={estilos.boton}>
          <Text style={estilos.texto}>Escuchar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { minHeight: 52, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  boton: { minHeight: 52, justifyContent: "center", paddingHorizontal: 8 },
  texto: { fontSize: 18, fontWeight: "700" },
});
