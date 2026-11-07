import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useConexion } from "../src/controladores/useConexion";
import { useEscuchar } from "../src/controladores/useEscuchar";
import { usePerfil } from "../src/controladores/usePerfil";
import { leerJson } from "../src/modelos/almacen";
import { Boton } from "../src/vistas/componentes/Boton";
import { BotonEmergencia } from "../src/vistas/componentes/BotonEmergencia";
import { Aviso } from "../src/vistas/componentes/Aviso";

export default function Inicio() {
  const { perfil, completo } = usePerfil();
  const conexion = useConexion();
  const voz = useEscuchar();
  const [omitido, setOmitido] = useState(false);
  useEffect(() => {
    void leerJson("registro_omitido", false).then(setOmitido);
  }, []);
  const nombre = perfil?.nombre?.trim() || "vecino/a";
  return (
    <View style={estilos.pagina}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Hola, {nombre}</Text>
        <Text style={estilos.zona}>{perfil?.zonaId || "Tu zona"}</Text>
        <Text style={[estilos.estado, { color: conexion === "conectado" ? "#1A6B3C" : "#3D2E00" }]}>
          {conexion === "conectado" ? "En línea" : "Sin conexión"}
        </Text>
      </View>
      {conexion !== "conectado" ? <Aviso tipo="amarillo">Sin conexión. Algunas acciones esperan internet.</Aviso> : null}
      {!completo || omitido ? <Aviso tipo="amarillo">Completa tus datos para que tu familia reciba tus avisos</Aviso> : null}
      {!completo || omitido ? <Boton variante="secundario" onPress={() => router.push("/registro/nombre")}>Completar mis datos</Boton> : null}
      <View style={estilos.fila}>
        <Boton variante="secundario" onPress={() => void voz.escuchar("Tamaño de letra aumentado", true)}>A+ Letra</Boton>
        <Boton variante="secundario" onPress={() => void voz.escuchar("Hola, " + nombre, true)}>Escuchar</Boton>
      </View>
      <Boton onPress={() => router.push("/buscar")}>Buscar servicios</Boton>
      <Boton onPress={() => router.push("/mis-servicios")}>Mis servicios</Boton>
      <Boton onPress={() => router.push("/ayuda")}>Ayuda entre vecinos</Boton>
      <Boton onPress={() => router.push("/mis-datos")}>Mis datos</Boton>
      <BotonEmergencia onPulsar={() => router.push("/emergencia")} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 14, padding: 16, justifyContent: "space-between" },
  encabezado: { gap: 6 },
  titulo: { fontSize: 30, fontWeight: "700" },
  zona: { fontSize: 20 },
  estado: { fontSize: 18, fontWeight: "700" },
  fila: { flexDirection: "row", gap: 10 },
});
