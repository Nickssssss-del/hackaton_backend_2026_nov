import * as Contacts from "expo-contacts";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BarraRegistro } from "../../src/vistas/componentes/BarraRegistro";
import { Boton } from "../../src/vistas/componentes/Boton";
import { useEscuchar } from "../../src/controladores/useEscuchar";

export default function RegistroContactosPermiso() {
  const voz = useEscuchar();
  const pedir = async () => {
    const permiso = await Contacts.requestPermissionsAsync();
    router.push(permiso.granted ? "/registro/contactos" : "/registro/contactos?manual=1");
  };
  return (
    <View style={estilos.pagina}>
      <BarraRegistro pregunta={4} texto="¿A quién avisamos si te pasa algo?" escuchar={() => void voz.escuchar("¿A quién avisamos si te pasa algo?")} />
      <Text style={estilos.texto}>Puedes elegir dos personas de tu agenda. Si no das permiso, escribirás sus números.</Text>
      <Boton onPress={() => void pedir()}>Dar permiso a contactos</Boton>
      <Boton variante="secundario" onPress={() => router.push("/registro/contactos?manual=1")}>Escribir los números</Boton>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 18, padding: 16 },
  texto: { fontSize: 20, lineHeight: 28 },
});
