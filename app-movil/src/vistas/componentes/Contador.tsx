/**
 * Vista. Selector − valor + (edad en A4, cantidad y hora en C2).
 */
import { Pressable, StyleSheet, View } from "react-native";
import { ALTO_BOTON_PRINCIPAL, RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono } from "./Icono";
import { Texto } from "./Texto";

type Props = {
  /** Texto visible en el centro, p. ej. "74 años" o "2:00 p. m.". */
  valor: string;
  /** Nombre para lectores de pantalla, p. ej. "Edad". */
  nombre: string;
  onMenos: () => void;
  onMas: () => void;
  puedeMenos?: boolean;
  puedeMas?: boolean;
};

export function Contador({ valor, nombre, onMenos, onMas, puedeMenos = true, puedeMas = true }: Props) {
  const { tema } = useTema();
  const c = tema.colores;
  const boton = (habilitado: boolean) => [
    estilos.boton,
    { borderColor: habilitado ? c.accion : c.desactivado, backgroundColor: c.superficie },
  ];
  return (
    <View style={estilos.fila}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Menos ${nombre.toLowerCase()}`}
        disabled={!puedeMenos}
        onPress={onMenos}
        style={boton(puedeMenos)}
      >
        <Icono nombre="minus" tamano={28} color={puedeMenos ? c.accion : c.desactivadoTexto} />
      </Pressable>
      <View style={[estilos.valor, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <Texto variante="subtitulo" centrado accessibilityLiveRegion="polite">{valor}</Texto>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Más ${nombre.toLowerCase()}`}
        disabled={!puedeMas}
        onPress={onMas}
        style={boton(puedeMas)}
      >
        <Icono nombre="plus" tamano={28} color={puedeMas ? c.accion : c.desactivadoTexto} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "stretch", gap: 10 },
  boton: {
    width: ALTO_BOTON_PRINCIPAL,
    minHeight: ALTO_BOTON_PRINCIPAL,
    borderRadius: RADIO.m,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  valor: {
    flex: 1,
    minHeight: ALTO_BOTON_PRINCIPAL,
    borderRadius: RADIO.m,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
});
