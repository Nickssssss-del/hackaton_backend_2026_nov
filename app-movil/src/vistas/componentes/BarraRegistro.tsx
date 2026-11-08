import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Boton } from "./Boton";
import { Encabezado } from "./Encabezado";
import { useRegistro } from "../../controladores/useRegistro";

export function BarraRegistro({ pregunta, texto, escuchar }: { pregunta: number; texto: string; escuchar: () => void }) {
  const registro = useRegistro();
  const saltar = async () => {
    await registro.saltar();
    router.replace("/inicio");
  };
  return (
    <>
      <Encabezado onVolver={() => router.back()} escuchar={escuchar} />
      <View style={estilos.fila}>
        <Text style={estilos.progreso}>Pregunta {pregunta} de 4</Text>
        <Boton variante="secundario" onPress={() => void saltar()}>Saltar</Boton>
      </View>
      <Text style={estilos.titulo}>{texto}</Text>
    </>
  );
}

const estilos = StyleSheet.create({
  fila: { minHeight: 52, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progreso: { fontSize: 18 },
  titulo: { fontSize: 26, lineHeight: 34, fontWeight: "700" },
});
