/**
 * Tokens de diseño del Mockup v4 (Vecinos · ordenado por flujos).
 * Código de colores con un solo significado: azul Tocar, verde Listo, amarillo Aviso, rojo Emergencia.
 * Modo oscuro (matriz, p. 26): fondo #121417 y texto #F4F4F4; rojo, verde y azul se mantienen en botones.
 * Letra mínima 20 px. Tamaños: Normal 20, Grande 23, Enorme 26 (decisión del equipo, 7-nov-2026).
 */
import type { TamanoLetra } from "../../modelos/local/preferencias";

export type { TamanoLetra };
export type TemaNombre = "claro" | "emergencia" | "oscuro";

export const LETRA_MINIMA = 20;

export const TAMANOS_LETRA: Record<TamanoLetra, { etiqueta: string; base: number; escala: number }> = {
  normal: { etiqueta: "Normal", base: 20, escala: 1 },
  grande: { etiqueta: "Grande", base: 23, escala: 1.15 },
  enorme: { etiqueta: "Enorme", base: 26, escala: 1.3 },
};

export interface ColoresTema {
  // Nombres usados por las pantallas anteriores (se mantienen mientras existan).
  accion: string;
  confirmado: string;
  peligro: string;
  peligroOscuro: string;
  aviso: string;
  avisoTexto: string;
  texto: string;
  textoSecundario: string;
  fondo: string;
  superficie: string;
  // Mockup v4.
  /** Texto e íconos sobre botones de color. */
  sobreColor: string;
  accionSuave: string;
  confirmadoSuave: string;
  avisoBorde: string;
  peligroSuave: string;
  borde: string;
  desactivado: string;
  desactivadoTexto: string;
  interruptorNo: string;
}

export interface TokensTema {
  nombre: TemaNombre;
  oscuro: boolean;
  colores: ColoresTema;
  tamano: TamanoLetra;
  /** Multiplicador sobre 20 px: 1, 1.15 o 1.3. */
  escalaLetra: number;
}

const BASE_COLOR = {
  accion: "#1F4E9C",
  confirmado: "#196B3B",
  peligro: "#D91023",
  peligroOscuro: "#9E0B18",
  avisoBorde: "#DCA838",
  sobreColor: "#FFFFFF",
};

const CLARO: ColoresTema = {
  ...BASE_COLOR,
  aviso: "#FFF1C2",
  avisoTexto: "#3D2E00",
  texto: "#1B1B1B",
  textoSecundario: "#4A4A4A",
  fondo: "#F5F4EF",
  superficie: "#FFFFFF",
  accionSuave: "#E6EEF9",
  confirmadoSuave: "#E3F0E6",
  peligroSuave: "#FBE3E5",
  borde: "#D9D9D9",
  desactivado: "#E7E5DF",
  desactivadoTexto: "#5A5A5A",
  // El mockup usa #8B8B8B; se oscurece para que "No" en blanco cumpla contraste AA (4.9:1).
  interruptorNo: "#6E6E6E",
};

/** Fondo y texto del oscuro vienen de la matriz; el resto es propuesta con contraste AA (por validar). */
const OSCURO: ColoresTema = {
  ...BASE_COLOR,
  aviso: "#3B3114",
  avisoTexto: "#FFE9A8",
  texto: "#F4F4F4",
  textoSecundario: "#C4C7CC",
  fondo: "#121417",
  superficie: "#1E2228",
  accionSuave: "#1E2A3D",
  confirmadoSuave: "#17301F",
  peligroSuave: "#3A1418",
  borde: "#3A3F47",
  desactivado: "#2A2E35",
  desactivadoTexto: "#B8BCC2",
  interruptorNo: "#6B7079",
};

export function crearTema(nombre: TemaNombre, oscuro: boolean, tamano: TamanoLetra): TokensTema {
  const colores = nombre === "emergencia" ? { ...CLARO, superficie: CLARO.aviso } : oscuro ? OSCURO : CLARO;
  return {
    nombre,
    oscuro: nombre !== "emergencia" && oscuro,
    colores,
    tamano,
    escalaLetra: TAMANOS_LETRA[tamano].escala,
  };
}

/** Tamaño de letra escalado; nunca baja del mínimo de 20 px. */
export function tamanoLetra(base: number, escala: number): number {
  return Math.max(LETRA_MINIMA, Math.round(base * escala));
}

export const ESPACIO = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
export const RADIO = { s: 10, m: 14, l: 18, pastilla: 999 } as const;
/** Área táctil mínima (RNF: ≥ 48 dp). Los botones principales usan 60. */
export const ALTO_TACTIL = 52;
export const ALTO_BOTON_PRINCIPAL = 60;
