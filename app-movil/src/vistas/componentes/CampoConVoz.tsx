/**
 * Vista. Campo de texto con micrófono (RNF-07: toda entrada tiene alternativa por voz).
 * Lo dictado queda escrito en el campo para revisarlo. Sin micrófono (Expo Go), se usa el teclado.
 * Con `digitos` (celular, código) se dicta de a pedazos y con palabras: «939… 123… 456» o
 * «novecientos treinta y nueve…» llenan el campo con los dígitos (controladores/useVoz.ts).
 */
import { useCallback } from "react";
import { Pressable, StyleSheet, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { useVoz } from "../../controladores/useVoz";
import { ALTO_BOTON_PRINCIPAL, RADIO, tamanoLetra } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono } from "./Icono";
import { Texto } from "./Texto";

type Props = {
  etiqueta: string;
  valor: string;
  onCambiar: (texto: string) => void;
  ayuda?: string;
  maxLength?: number;
  teclado?: KeyboardTypeOptions;
  /** Borde verde cuando el dato está completo (A4). */
  completo?: boolean;
  /** Oculta el micrófono (p. ej. números de celular). */
  sinVoz?: boolean;
  /** Dictado de números: cuántos dígitos se esperan (9 celular, 6 código). Deja de escuchar al completarlos. */
  digitos?: number;
};

export function CampoConVoz({ etiqueta, valor, onCambiar, ayuda, maxLength = 140, teclado, completo, sinVoz, digitos }: Props) {
  const { tema } = useTema();
  const c = tema.colores;
  // En modo números llegan solo dígitos (ya convertidos): se cortan a los esperados, no al largo del texto dicho.
  const alReconocer = useCallback(
    (texto: string) => onCambiar(digitos !== undefined ? texto.slice(0, digitos) : texto.slice(0, maxLength)),
    [onCambiar, maxLength, digitos],
  );
  const voz = useVoz(alReconocer, digitos !== undefined ? { digitos } : undefined);
  const fontSize = tamanoLetra(20, tema.escalaLetra);

  return (
    <View style={estilos.bloque}>
      <Texto variante="etiqueta" nativeID={`etq-${etiqueta}`}>{etiqueta}</Texto>
      <View style={estilos.fila}>
        <TextInput
          accessibilityLabel={etiqueta}
          accessibilityLabelledBy={`etq-${etiqueta}`}
          value={valor}
          onChangeText={onCambiar}
          placeholder={ayuda ? `Ej.: ${ayuda}` : undefined}
          placeholderTextColor={c.textoSecundario}
          maxLength={maxLength}
          keyboardType={teclado}
          maxFontSizeMultiplier={1.15}
          style={[
            estilos.campo,
            {
              fontSize,
              color: c.texto,
              backgroundColor: c.superficie,
              borderColor: completo ? c.confirmado : c.borde,
              fontFamily: "AtkinsonHyperlegible_400Regular",
            },
          ]}
        />
        {sinVoz ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={voz.escuchando ? `Dejar de escuchar ${etiqueta}` : `Decir ${etiqueta} con tu voz`}
            onPress={() => void voz.alternar()}
            style={[estilos.microfono, { backgroundColor: voz.escuchando ? c.confirmado : c.accion }]}
          >
            <Icono nombre={voz.escuchando ? "stop" : "microphone"} color={c.sobreColor} tamano={26} />
          </Pressable>
        )}
      </View>
      {voz.escuchando ? (
        <Texto variante="ayuda">{digitos !== undefined ? "Te escucho… puedes decirlo de a poquitos." : "Te escucho…"}</Texto>
      ) : null}
      {voz.teclado && !voz.disponible ? <Texto variante="ayuda">Escribe con el teclado.</Texto> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: 6 },
  fila: { flexDirection: "row", alignItems: "center", gap: 10, width: "100%" },
  campo: {
    flex: 1,
    minWidth: 0,
    minHeight: ALTO_BOTON_PRINCIPAL,
    borderRadius: RADIO.m,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  microfono: {
    flexShrink: 0,
    width: ALTO_BOTON_PRINCIPAL,
    height: ALTO_BOTON_PRINCIPAL,
    borderRadius: ALTO_BOTON_PRINCIPAL / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
