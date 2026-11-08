/**
 * Vista. Insignia de una palabra de Servicios (Mockup v4, pp. 17–18): «3 min» azul, «Abierto» verde,
 * «Cerrado» gris y vistos buenos en amarillo. Siempre lleva palabra o número, no solo color.
 */
import { StyleSheet, View } from "react-native";
import { RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono, type NombreIcono } from "./Icono";
import { Texto } from "./Texto";

export type TonoInsignia = "azul" | "verde" | "gris" | "amarillo";

export function Insignia({ tono, texto, icono, etiqueta }: { tono: TonoInsignia; texto: string; icono?: NombreIcono; etiqueta?: string }) {
  const { tema } = useTema();
  const c = tema.colores;
  const colores = {
    azul: { fondo: c.accionSuave, texto: c.accionTexto },
    verde: { fondo: c.confirmadoSuave, texto: tema.oscuro ? "#7BD39F" : c.confirmado },
    gris: { fondo: c.desactivado, texto: c.desactivadoTexto },
    amarillo: { fondo: c.aviso, texto: c.avisoTexto },
  }[tono];
  return (
    <View
      accessible
      accessibilityLabel={etiqueta ?? texto}
      style={[estilos.caja, { backgroundColor: colores.fondo }]}
    >
      {icono ? <Icono nombre={icono} tamano={20} color={colores.texto} /> : null}
      <Texto variante="etiqueta" color={colores.texto}>{texto}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIO.s,
  },
});
