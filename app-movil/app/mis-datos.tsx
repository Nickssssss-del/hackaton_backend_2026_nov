/**
 * Vista. Borrar los datos de la cuenta. Sin avisos SMS ni delegación.
 */
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useRegistro } from "../src/controladores/useRegistro";

export default function PantallaMisDatos() {
  const registro = useRegistro();
  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text>Los avisos por SMS y pedir que alguien publique por ti quedan para más adelante.</Text>
      {registro.error ? <Text>{registro.error}</Text> : null}
      <Pressable disabled={registro.enviando} onPress={() => void registro.borrar()} style={estilos.boton}>
        <Text style={estilos.texto}>Borrar mis datos</Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 12, padding: 16 },
  boton: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#8c2f2f" },
  texto: { color: "#ffffff", fontWeight: "700" },
});
