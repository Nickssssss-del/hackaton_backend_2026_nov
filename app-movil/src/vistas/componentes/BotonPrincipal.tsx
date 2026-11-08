/**
 * Vista. Botón del Mockup v4. El color tiene un solo significado:
 * tocar (azul), listo (verde), emergencia (rojo); secundario = borde azul.
 * Si está desactivado, muestra el motivo debajo del nombre ("Falta 1 dato", "Falta aceptar").
 */
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { ALTO_BOTON_PRINCIPAL, RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono, type NombreIcono } from "./Icono";
import { Texto } from "./Texto";

export type VarianteBoton = "tocar" | "listo" | "emergencia" | "secundario" | "secundarioListo" | "neutro";

type Props = {
  children: string;
  onPress: () => void;
  variante?: VarianteBoton;
  icono?: NombreIcono;
  /** Si se indica, el botón queda desactivado y muestra este motivo. */
  motivoDesactivado?: string | null;
  cargando?: boolean;
  estilo?: ViewStyle;
  accessibilityHint?: string;
};

export function BotonPrincipal({
  children,
  onPress,
  variante = "tocar",
  icono,
  motivoDesactivado,
  cargando,
  estilo,
  accessibilityHint,
}: Props) {
  const { tema } = useTema();
  const c = tema.colores;
  const desactivado = Boolean(motivoDesactivado) || Boolean(cargando);

  const colores: Record<VarianteBoton, { fondo: string; texto: string; borde: string }> = {
    tocar: { fondo: c.accion, texto: c.sobreColor, borde: c.accion },
    listo: { fondo: c.confirmado, texto: c.sobreColor, borde: c.confirmado },
    emergencia: { fondo: c.peligro, texto: c.sobreColor, borde: c.peligro },
    secundario: { fondo: c.superficie, texto: tema.oscuro ? c.texto : c.accion, borde: c.accion },
    secundarioListo: { fondo: c.superficie, texto: tema.oscuro ? c.texto : c.confirmado, borde: c.confirmado },
    neutro: { fondo: c.superficie, texto: c.texto, borde: c.borde },
  };
  const elegido = desactivado
    ? { fondo: c.desactivado, texto: c.desactivadoTexto, borde: c.desactivado }
    : colores[variante];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: desactivado, busy: Boolean(cargando) }}
      accessibilityLabel={motivoDesactivado ? `${children}. ${motivoDesactivado}` : children}
      accessibilityHint={accessibilityHint}
      disabled={desactivado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: elegido.fondo, borderColor: elegido.borde, opacity: pressed ? 0.85 : 1 },
        estilo,
      ]}
    >
      <View style={estilos.fila}>
        {icono && !desactivado ? <Icono nombre={icono} color={elegido.texto} /> : null}
        <Texto variante="boton" color={elegido.texto} centrado ajustar={2} style={{ flexShrink: 1 }}>
          {cargando ? "Un momento…" : children}
        </Texto>
      </View>
      {motivoDesactivado ? (
        <Texto variante="ayuda" color={elegido.texto} centrado>
          {motivoDesactivado}
        </Texto>
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: ALTO_BOTON_PRINCIPAL,
    borderRadius: RADIO.m,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fila: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" },
});
