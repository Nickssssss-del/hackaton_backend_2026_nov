/**
 * Vista. Grupo de opciones (Mujer/Hombre/No decir, Mañana/Tarde/Noche, filtros, categorías).
 * Selección única o múltiple. La opción elegida se marca con color y borde, no solo con color.
 */
import { Pressable, StyleSheet, View } from "react-native";
import { ALTO_TACTIL, RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono, type NombreIcono } from "./Icono";
import { Texto } from "./Texto";

export type Opcion<T extends string> = { valor: T; etiqueta: string; icono?: NombreIcono };

type Props<T extends string> = {
  opciones: Opcion<T>[];
  seleccion: T[];
  onCambiar: (seleccion: T[]) => void;
  multiple?: boolean;
  /** Columnas por fila; por defecto todas en una fila que se ajusta. */
  columnas?: number;
  nombre?: string;
};

export function Opciones<T extends string>({ opciones, seleccion, onCambiar, multiple, columnas, nombre }: Props<T>) {
  const { tema } = useTema();
  const c = tema.colores;
  const tocar = (valor: T) => {
    if (!multiple) {
      onCambiar([valor]);
      return;
    }
    onCambiar(seleccion.includes(valor) ? seleccion.filter((v) => v !== valor) : [...seleccion, valor]);
  };
  return (
    <View style={estilos.grupo} accessibilityRole={multiple ? undefined : "radiogroup"} accessibilityLabel={nombre}>
      {opciones.map((op) => {
        const activa = seleccion.includes(op.valor);
        return (
          <Pressable
            key={op.valor}
            accessibilityRole={multiple ? "checkbox" : "radio"}
            accessibilityState={multiple ? { checked: activa } : { selected: activa }}
            accessibilityLabel={op.etiqueta}
            onPress={() => tocar(op.valor)}
            style={[
              estilos.opcion,
              columnas ? { flexBasis: `${100 / columnas - 3}%` } : estilos.flexible,
              {
                backgroundColor: activa ? c.accionSuave : c.superficie,
                borderColor: activa ? c.accion : c.borde,
                borderWidth: activa ? 3 : 1.5,
              },
            ]}
          >
            {op.icono ? <Icono nombre={op.icono} color={c.accionTexto} /> : null}
            <Texto variante="etiqueta" centrado color={activa ? c.accionTexto : c.texto}>
              {op.etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flexible: { flexGrow: 1 },
  opcion: {
    minHeight: ALTO_TACTIL + 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIO.m,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
});
