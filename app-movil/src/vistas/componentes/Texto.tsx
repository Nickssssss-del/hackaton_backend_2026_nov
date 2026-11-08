/**
 * Vista. Todo texto del Mockup v4 pasa por aquí: aplica la escala (20/23/26) y nunca baja de 20 px.
 * Si la letra crece, el texto se ajusta en varias líneas; la pantalla se desplaza (nada se corta).
 */
import { Text, type TextProps, type TextStyle } from "react-native";
import { tamanoLetra } from "../tema/tokens";
import { useTema } from "../tema/useTema";

export type VarianteTexto = "titulo" | "subtitulo" | "cuerpo" | "etiqueta" | "boton" | "ayuda" | "grande";

const BASE: Record<VarianteTexto, { tamano: number; negrita: boolean }> = {
  grande: { tamano: 34, negrita: true },
  titulo: { tamano: 28, negrita: true },
  subtitulo: { tamano: 24, negrita: true },
  boton: { tamano: 22, negrita: true },
  etiqueta: { tamano: 20, negrita: true },
  cuerpo: { tamano: 20, negrita: false },
  ayuda: { tamano: 20, negrita: false },
};

type Props = TextProps & {
  variante?: VarianteTexto;
  color?: string;
  centrado?: boolean;
  negrita?: boolean;
};

export function Texto({ variante = "cuerpo", color, centrado, negrita, style, ...props }: Props) {
  const { tema } = useTema();
  const base = BASE[variante];
  const fontSize = tamanoLetra(base.tamano, tema.escalaLetra);
  const enNegrita = negrita ?? base.negrita;
  const estilo: TextStyle = {
    fontSize,
    lineHeight: Math.round(fontSize * 1.3),
    fontFamily: enNegrita ? "AtkinsonHyperlegible_700Bold" : "AtkinsonHyperlegible_400Regular",
    color: color ?? (variante === "ayuda" ? tema.colores.textoSecundario : tema.colores.texto),
    textAlign: centrado ? "center" : undefined,
  };
  // El tamaño ya lo controla la app (A+ / Aa); se limita el escalado extra del sistema para no cortar.
  return <Text maxFontSizeMultiplier={1.15} {...props} style={[estilo, style]} />;
}
