import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Boton } from "../../src/vistas/componentes/Boton";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useUbicacion } from "../../src/controladores/useUbicacion";
import { guardarPerfilLocal, leerPerfilLocal } from "../../src/modelos/local/perfil";

export default function Ubicacion() {
  const ubicacion = useUbicacion();
  const voz = useEscuchar();
  const pedir = async () => {
    const resultado = await ubicacion.pedirUnaVez();
    if (resultado) {
      const perfil = await leerPerfilLocal();
      await guardarPerfilLocal({ ...(perfil ?? {}), lat: resultado.lat, lng: resultado.lng });
    }
    router.replace(resultado ? "/registro/nombre" : "/bienvenida/ubicacion-ajustes");
  };
  const texto = "Con tu ubicación la app te muestra lo más cerca";
  return (
    <View style={estilos.pagina}>
      <Encabezado onVolver={() => router.replace("/inicio")} escuchar={() => void voz.escuchar(texto, true)} />
      <Text style={estilos.titulo}>{texto}</Text>
      <Boton disabled={ubicacion.cargando} onPress={() => void pedir()}>Permitir ubicación</Boton>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 18, padding: 16, justifyContent: "center" },
  titulo: { fontSize: 24, lineHeight: 32, fontWeight: "700" },
});
