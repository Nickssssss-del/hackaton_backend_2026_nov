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
  /** Azul para íconos y texto sobre superficies: en oscuro se aclara para tener contraste AA. */
  accionTexto: string;
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
  accionTexto: "#1F4E9C",
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
  accionTexto: "#8FB3EC",
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

/**
 * Colores de los íconos de las tarjetas (Mockup v4: Servicios naranja, Comunidad morado,
 * Mi negocio verde azulado, Ayuda vecinal rojo…). En oscuro, el ícono se aclara y el fondo
 * del círculo se oscurece para mantener contraste.
 */
export type ColorIcono = "azul" | "naranja" | "amarillo" | "morado" | "turquesa" | "rojo" | "verde" | "gris";

const ICONO_CLARO: Record<ColorIcono, { icono: string; fondo: string }> = {
  azul: { icono: "#1F4E9C", fondo: "#E6EEF9" },
  // Panaderías y vistos buenos (Mockup v4, pp. 16–18): fondo amarillo con ícono marrón dorado.
  amarillo: { icono: "#9A5B0F", fondo: "#FFF1C2" },
  naranja: { icono: "#C2701F", fondo: "#FBEBDC" },
  morado: { icono: "#7A52B3", fondo: "#EFE8F7" },
  turquesa: { icono: "#186868", fondo: "#DFF0EF" },
  rojo: { icono: "#D91023", fondo: "#FBE3E5" },
  verde: { icono: "#196B3B", fondo: "#E3F0E6" },
  gris: { icono: "#5A5A5A", fondo: "#EDEBE6" },
};

const ICONO_OSCURO: Record<ColorIcono, { icono: string; fondo: string }> = {
  azul: { icono: "#8FB3EC", fondo: "#1E2A3D" },
  amarillo: { icono: "#F2C46D", fondo: "#3B3114" },
  naranja: { icono: "#F0A860", fondo: "#3A2A1A" },
  morado: { icono: "#C2A6EE", fondo: "#2D2340" },
  turquesa: { icono: "#72C9C2", fondo: "#173332" },
  rojo: { icono: "#FF8A94", fondo: "#3A1418" },
  verde: { icono: "#7BD39F", fondo: "#17301F" },
  gris: { icono: "#C4C7CC", fondo: "#2A2E35" },
};

export function colorIcono(color: ColorIcono, oscuro: boolean) {
  return (oscuro ? ICONO_OSCURO : ICONO_CLARO)[color];
}
