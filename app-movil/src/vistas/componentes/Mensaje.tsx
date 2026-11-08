/**
 * Vista. Mensaje de una línea con el tema del Mockup v4 (claro/oscuro, letra escalada).
 * aviso = amarillo (sin la palabra «error»), info = azul suave, listo = verde suave.
 */
import { StyleSheet, View } from "react-native";
import { RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono, type NombreIcono } from "./Icono";
import { Texto } from "./Texto";

type Tono = "aviso" | "info" | "listo";

export function Mensaje({ tono = "info", children }: { tono?: Tono; children: string }) {
  const { tema } = useTema();
  const c = tema.colores;
  const estilo = {
    aviso: { fondo: c.aviso, borde: c.avisoBorde, texto: c.avisoTexto, icono: "alert-circle-outline" },
    info: { fondo: c.accionSuave, borde: c.accion, texto: c.texto, icono: "information-outline" },
    listo: { fondo: c.confirmadoSuave, borde: c.confirmado, texto: c.texto, icono: "check-circle-outline" },
  }[tono] as { fondo: string; borde: string; texto: string; icono: NombreIcono };
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[estilos.caja, { backgroundColor: estilo.fondo, borderColor: estilo.borde }]}
    >
      <Icono nombre={estilo.icono} color={estilo.texto} />
      <Texto color={estilo.texto} style={estilos.texto}>{children}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: RADIO.m, borderWidth: 1.5 },
  texto: { flex: 1 },
});
