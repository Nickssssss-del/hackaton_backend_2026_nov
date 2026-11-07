import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useZona } from "../../src/controladores/useZona";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { guardarJson } from "../../src/modelos/almacen";

export default function ZonaBienvenida() {
  const zona = useZona();
  const voz = useEscuchar();
  const elegir = async (id: string) => {
    zona.elegirZona(id);
    await guardarJson("zona_manual", id);
    router.replace("/registro/nombre");
  };
  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Encabezado onVolver={() => router.replace("/bienvenida/ubicacion-ajustes")} escuchar={() => void voz.escuchar("Elige tu barrio", true)} />
      <Text style={estilos.titulo}>Elige tu barrio</Text>
      {zona.zonas.map((item) => (
        <Pressable key={item.id} onPress={() => void elegir(item.id)} style={estilos.opcion}>
          <Text style={estilos.texto}>{item.nombre} ({item.distrito})</Text>
        </Pressable>
      ))}
      {zona.zonas.length === 0 ? <Text style={estilos.texto}>No hay una copia de zonas disponible.</Text> : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 14, padding: 16 },
  titulo: { fontSize: 26, fontWeight: "700" },
  opcion: { minHeight: 52, justifyContent: "center", padding: 12, borderRadius: 10, backgroundColor: "#F4F1EA" },
  texto: { fontSize: 18 },
});
