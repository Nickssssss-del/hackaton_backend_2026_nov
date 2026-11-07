import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Boton } from "../../src/vistas/componentes/Boton";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useUbicacion } from "../../src/controladores/useUbicacion";

export default function UbicacionAjustes() {
  const ubicacion = useUbicacion();
  const voz = useEscuchar();
  const texto = "La ubicación está apagada";
  return (
    <View style={estilos.pagina}>
      <Encabezado onVolver={() => router.replace("/bienvenida/ubicacion")} escuchar={() => void voz.escuchar(texto)} />
      <Text style={estilos.titulo}>{texto}</Text>
      <Boton onPress={ubicacion.abrirAjustes}>Abrir configuración</Boton>
      <Boton variante="secundario" onPress={() => void voz.escuchar("Pedir a mi familiar que lo active")}>
        Pedir a mi familiar que lo active
      </Boton>
      <Boton variante="secundario" onPress={() => router.replace("/bienvenida/zona")}>
        Elegir mi barrio de una lista
      </Boton>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 18, padding: 16, justifyContent: "center" },
  titulo: { fontSize: 24, fontWeight: "700" },
});
