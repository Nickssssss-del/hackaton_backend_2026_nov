/**
 * Vista. Recibe la acción del controlador.
 * No importa clientes remotos.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRef, useState } from "react";
import { useTema } from "../tema/useTema";

type Props = {
  onPulsar: () => void;
};

export function BotonEmergencia({ onPulsar }: Props) {
  const { tema } = useTema();
  const [aviso, setAviso] = useState(false);
  const pulsacionLarga = useRef(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mantén presionado 2 segundos"
        onPress={() => {
          if (pulsacionLarga.current) {
            pulsacionLarga.current = false;
            return;
          }
          setAviso(true);
        }}
        onLongPress={() => {
          pulsacionLarga.current = true;
          onPulsar();
        }}
        delayLongPress={2000}
        style={[estilos.boton, { backgroundColor: tema.colores.peligro }]}
      >
        <Text style={[estilos.texto, { color: tema.colores.fondo }]}>Emergencia</Text>
      </Pressable>
      {aviso ? (
        <Text style={[estilos.aviso, { color: tema.colores.textoSecundario }]}>
          Mantén presionado 2 segundos
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  texto: {
    fontSize: 18,
    fontWeight: "700",
  },
  aviso: { fontSize: 18, marginTop: 8, textAlign: "center" },
});
