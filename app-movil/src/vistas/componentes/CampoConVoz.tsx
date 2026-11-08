/**
 * Vista. Campo de texto con micrófono (RNF-07: toda entrada tiene alternativa por voz).
 * Lo dictado queda escrito en el campo para revisarlo. Sin micrófono (Expo Go), se usa el teclado.
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
};

export function CampoConVoz({ etiqueta, valor, onCambiar, ayuda, maxLength = 140, teclado, completo, sinVoz }: Props) {
  const { tema } = useTema();
  const c = tema.colores;
  const alReconocer = useCallback((texto: string) => onCambiar(texto.slice(0, maxLength)), [onCambiar, maxLength]);
  const voz = useVoz(alReconocer);
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
          placeholder={ayuda}
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
      {voz.escuchando ? <Texto variante="ayuda">Te escucho…</Texto> : null}
      {voz.teclado && !voz.disponible ? <Texto variante="ayuda">Escribe con el teclado.</Texto> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: 6 },
  fila: { flexDirection: "row", alignItems: "center", gap: 10 },
  campo: {
    flex: 1,
    minHeight: ALTO_BOTON_PRINCIPAL,
    borderRadius: RADIO.m,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  microfono: {
    width: ALTO_BOTON_PRINCIPAL,
    height: ALTO_BOTON_PRINCIPAL,
    borderRadius: ALTO_BOTON_PRINCIPAL / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
