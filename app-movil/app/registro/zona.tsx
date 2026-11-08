import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { BarraRegistro } from "../../src/vistas/componentes/BarraRegistro";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useRegistro } from "../../src/controladores/useRegistro";
import { useZona } from "../../src/controladores/useZona";

export default function RegistroZona() {
  const registro = useRegistro();
  const zona = useZona();
  const voz = useEscuchar();
  const elegir = async (id: string) => {
    await registro.guardarPaso({ zonaId: id });
    router.push("/registro/contactos-permiso");
  };
  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <BarraRegistro pregunta={3} texto={`¿Vives en ${registro.perfil?.zonaId || "tu barrio"}?`} escuchar={() => void voz.escuchar("Elige la zona donde vives", true)} />
      {zona.zonas.map((item) => (
        <Pressable key={item.id} onPress={() => void elegir(item.id)} style={estilos.opcion}>
          <Text style={estilos.texto}>{item.nombre} ({item.distrito})</Text>
        </Pressable>
      ))}
      {zona.zonas.length === 0 ? <Text style={estilos.texto}>No hay zonas disponibles. Puedes continuar cuando haya una copia local.</Text> : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 14, padding: 16 },
  opcion: { minHeight: 52, justifyContent: "center", padding: 12, borderRadius: 10, backgroundColor: "#F4F1EA" },
  texto: { fontSize: 18 },
});
