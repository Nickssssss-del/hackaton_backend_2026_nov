import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function EstadoVista({ estado }: { estado: "cargando" | "vacio" | "sinConexion" | "error" }) {
  const textos = {
    cargando: "Cargando…",
    vacio: "No hay resultados.",
    sinConexion: "Sin conexión. Puedes seguir viendo lo guardado.",
    error: "Algo salió mal.",
  };
  return (
    <View style={estilos.contenedor}>
      {estado === "cargando" ? <ActivityIndicator /> : null}
      <Text style={estilos.texto}>{textos[estado]}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 16, gap: 8, backgroundColor: "#FFF1C2" },
  texto: { fontSize: 18, color: "#3D2E00" },
});
