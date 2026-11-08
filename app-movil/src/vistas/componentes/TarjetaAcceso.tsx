/**
 * Vista. Tarjeta táctil de los Inicios y listas (Horario de pastillas, Pregúntale a Vecinos, Mis datos…).
 * Toda la tarjeta es un botón; el ícono acompaña siempre a una palabra.
 */
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { colorIcono as paletaIcono, RADIO, type ColorIcono } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono, type NombreIcono } from "./Icono";
import { Texto } from "./Texto";

export type TonoTarjeta = "normal" | "aviso" | "tocar" | "listo" | "emergencia" | "tocarSuave";

type Props = {
  titulo: string;
  subtitulo?: string;
  icono?: NombreIcono;
  tono?: TonoTarjeta;
  /** Elemento a la derecha: flecha (por defecto), flecha en círculo azul (A2), micrófono o nada. */
  accion?: "flecha" | "flechaCirculo" | "microfono" | "ninguna";
  /** Color del círculo del ícono (Mockup v4: Servicios naranja, Comunidad morado…). */
  colorIcono?: ColorIcono;
  /** Diseño vertical (ícono arriba), para las rejillas de 2 columnas. */
  vertical?: boolean;
  seleccionada?: boolean;
  onPress: () => void;
  children?: ReactNode;
  /** Contenido sobre la fila principal (p. ej. la ilustración de A2). */
  encima?: ReactNode;
  estilo?: ViewStyle;
  accessibilityLabel?: string;
};

export function TarjetaAcceso({
  titulo,
  subtitulo,
  icono,
  tono = "normal",
  accion = "flecha",
  vertical,
  seleccionada,
  onPress,
  children,
  encima,
  colorIcono = "azul",
  estilo,
  accessibilityLabel,
}: Props) {
  const { tema } = useTema();
  const c = tema.colores;
  const lleno = tono === "tocar" || tono === "listo" || tono === "emergencia";
  const suave = tono === "tocarSuave";
  const paleta = paletaIcono(colorIcono, tema.oscuro);
  const fondo = {
    tocarSuave: c.accionSuave,
    normal: c.superficie,
    aviso: c.aviso,
    tocar: c.accion,
    listo: c.confirmado,
    emergencia: c.peligro,
  }[tono];
  const colorTexto = lleno ? c.sobreColor : tono === "aviso" ? c.avisoTexto : c.texto;
  const borde = seleccionada || suave ? c.accion : tono === "aviso" ? c.avisoBorde : lleno ? fondo : c.borde;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={seleccionada === undefined ? undefined : { selected: seleccionada }}
      accessibilityLabel={accessibilityLabel ?? [titulo, subtitulo].filter(Boolean).join(". ")}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.tarjeta,
        encima ? estilos.columna : vertical ? estilos.vertical : estilos.horizontal,
        { backgroundColor: fondo, borderColor: borde, borderWidth: seleccionada ? 3 : suave ? 2.5 : 1.5, opacity: pressed ? 0.85 : 1 },
        estilo,
      ]}
    >
      {encima}
      <View style={encima ? estilos.horizontal : estilos.contenidoPlano}>
        {icono ? (
          <View
            style={[
              estilos.icono,
              { backgroundColor: lleno ? "transparent" : suave ? c.accion : tono === "aviso" ? c.superficie : paleta.fondo },
            ]}
          >
            <Icono nombre={icono} color={lleno || suave ? c.sobreColor : paleta.icono} tamano={26} />
          </View>
        ) : null}
        <View style={vertical ? estilos.textosVertical : estilos.textos}>
          <Texto variante="etiqueta" color={colorTexto} centrado={vertical}>{titulo}</Texto>
          {subtitulo ? (
            <Texto variante="ayuda" color={lleno || tono === "aviso" ? colorTexto : c.textoSecundario} centrado={vertical}>
              {subtitulo}
            </Texto>
          ) : null}
          {children}
        </View>
        {!vertical && accion === "flecha" ? <Icono nombre="chevron-right" color={colorTexto} tamano={28} /> : null}
        {!vertical && accion === "flechaCirculo" ? (
          <View style={[estilos.mic, { backgroundColor: c.accion }]}>
            <Icono nombre="chevron-right" color={c.sobreColor} tamano={28} />
          </View>
        ) : null}
        {!vertical && accion === "microfono" ? (
          <View style={[estilos.mic, { backgroundColor: paletaIcono("turquesa", false).icono }]}>
            <Icono nombre="microphone" color={c.sobreColor} tamano={24} />
          </View>
        ) : null}
        {seleccionada ? (
          <View style={[estilos.check, { backgroundColor: c.accion }]}>
            <Icono nombre="check" color={c.sobreColor} tamano={18} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: RADIO.l, padding: 14, minHeight: 72 },
  horizontal: { flexDirection: "row", alignItems: "center", gap: 12 },
  columna: { gap: 12 },
  contenidoPlano: { display: "contents" },
  vertical: { alignItems: "center", justifyContent: "center", gap: 8, flex: 1 },
  icono: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  textos: { flex: 1, gap: 2 },
  textosVertical: { gap: 2, alignItems: "center" },
  mic: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  check: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
