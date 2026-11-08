/**
 * Vista. «Esto cambia en la app»: lista lo que hará cada opción elegida en B4.
 */
import { StyleSheet, View } from "react-native";
import { efectosDe } from "../../modelos/efectosSituaciones";
import type { Situacion } from "../../modelos/local/situaciones";
import { RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono } from "./Icono";
import { Texto } from "./Texto";

export function EfectosSituaciones({ seleccion }: { seleccion: Situacion[] }) {
  const { tema } = useTema();
  const c = tema.colores;
  const efectos = efectosDe(seleccion);
  if (efectos.length === 0) return null;
  return (
    <View style={[estilos.caja, { backgroundColor: c.superficie, borderColor: c.borde }]} accessibilityLabel={`Esto cambia en la app: ${efectos.join(" ")}`}>
      <Texto variante="etiqueta">Esto cambia en la app:</Texto>
      {efectos.map((e) => (
        <View key={e} style={estilos.fila}>
          <Icono nombre="check-circle" tamano={22} color={c.confirmado} />
          <Texto variante="ayuda" style={estilos.texto}>{e}</Texto>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: RADIO.m, padding: 14, gap: 8 },
  fila: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  texto: { flex: 1 },
});
