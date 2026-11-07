import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { guardarJson } from "../../src/modelos/almacen";
import { Boton } from "../../src/vistas/componentes/Boton";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { useEscuchar } from "../../src/controladores/useEscuchar";

const PASOS = [
  "Azul significa hacer. Verde significa listo. Rojo es solo para una emergencia.",
  "El botón rojo funciona cuando lo mantienes presionado 2 segundos.",
  "Puedes tocar Escuchar en cada pantalla y aumentar el tamaño de letra.",
];

export default function Tutorial() {
  const [paso, setPaso] = useState(0);
  const voz = useEscuchar();
  const terminar = async () => {
    await guardarJson("tutorial_visto", true);
    router.replace("/bienvenida/ubicacion");
  };
  return (
    <View style={estilos.pagina}>
      <Encabezado onVolver={() => router.replace("/inicio")} escuchar={() => void voz.escuchar(PASOS[paso], true)} />
      <Text style={estilos.titulo}>Bienvenida</Text>
      <Text style={estilos.paso}>Paso {paso + 1} de 3</Text>
      <Text style={estilos.texto}>{PASOS[paso]}</Text>
      <Boton onPress={() => void voz.escuchar(PASOS[paso], true)}>Escuchar</Boton>
      {paso < 2 ? <Boton onPress={() => setPaso(paso + 1)}>Siguiente</Boton> : <Boton onPress={() => void terminar()}>Continuar</Boton>}
      <Boton variante="secundario" onPress={() => void terminar()}>Saltar</Boton>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 18, padding: 16, justifyContent: "center" },
  titulo: { fontSize: 30, fontWeight: "700" },
  paso: { fontSize: 18 },
  texto: { fontSize: 22, lineHeight: 30 },
});
