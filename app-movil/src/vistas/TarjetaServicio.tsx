/**
 * Vista. Resumen de un servicio público. El visto bueno vive en el detalle.
 */
import { StyleSheet, Text, View } from "react-native";
import type { ServicioPublico } from "../modelos/tipos";

type Props = {
  servicio: ServicioPublico;
  minutos?: number;
};

export function TarjetaServicio({ servicio, minutos }: Props) {
  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.nombre}>{servicio.nombre}</Text>
      <Text>{servicio.oficio}</Text>
      <Text>{servicio.descripcion}</Text>
      <Text>{servicio.abiertoAhora ? "Abierto ahora" : "Cerrado ahora"}</Text>
      <Text>
        {servicio.zona} · {servicio.vistoBuenoTotal} vistos buenos
        {minutos ? ` · ≈ ${minutos} min a pie` : ""}
      </Text>
      {servicio.precioDesde !== undefined ? <Text>Desde S/ {servicio.precioDesde}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: 4, padding: 16, borderRadius: 12, backgroundColor: "#f4f1ea" },
  nombre: { fontSize: 18, fontWeight: "700" },
});
