/**
 * Vista. Grupo de opciones (Mujer/Hombre/No decir, Mañana/Tarde/Noche, filtros, categorías).
 * Selección única o múltiple. La opción elegida se marca con color y borde, no solo con color.
 */
import { Pressable, StyleSheet, View } from "react-native";
import { ALTO_TACTIL, colorIcono, RADIO, type ColorIcono } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono, type NombreIcono } from "./Icono";
import { Texto } from "./Texto";

export type Opcion<T extends string> = { valor: T; etiqueta: string; icono?: NombreIcono; color?: ColorIcono };

type Props<T extends string> = {
  opciones: Opcion<T>[];
  seleccion: T[];
  onCambiar: (seleccion: T[]) => void;
  multiple?: boolean;
  /** Columnas por fila; por defecto todas en una fila que se ajusta. */
  columnas?: number;
  nombre?: string;
  /** Tarjetas grandes con círculo de color y ✓ en la esquina (B4 del Mockup v4). */
  tarjetas?: boolean;
};

export function Opciones<T extends string>({ opciones, seleccion, onCambiar, multiple, columnas, nombre, tarjetas }: Props<T>) {
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
              tarjetas && estilos.tarjeta,
              {
                backgroundColor: activa && !tarjetas ? c.accionSuave : c.superficie,
                borderColor: activa ? c.accion : c.borde,
                borderWidth: activa ? 3 : 1.5,
              },
            ]}
          >
            {tarjetas && op.icono ? (
              <View style={[estilos.circulo, { backgroundColor: colorIcono(op.color ?? "azul", tema.oscuro).fondo }]}>
                <Icono nombre={op.icono} tamano={30} color={colorIcono(op.color ?? "azul", tema.oscuro).icono} />
              </View>
            ) : op.icono ? (
              <Icono nombre={op.icono} color={c.accionTexto} />
            ) : null}
            <Texto variante="etiqueta" centrado color={activa && !tarjetas ? c.accionTexto : c.texto}>
              {op.etiqueta}
            </Texto>
            {tarjetas && activa ? (
              <View style={[estilos.check, { backgroundColor: c.accion }]}>
                <Icono nombre="check" tamano={18} color={c.sobreColor} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flexible: { flexGrow: 1 },
  tarjeta: { minHeight: 120, paddingVertical: 14, gap: 8, flexGrow: 1 },
  circulo: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  check: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
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
