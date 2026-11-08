export type TemaNombre = "claro" | "emergencia" | "oscuro";

export interface TokensTema {
  nombre: TemaNombre;
  colores: {
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
  };
  escalaLetra: 1 | 1.25 | 1.5;
}

export const temas: Record<TemaNombre, TokensTema> = {
  claro: {
    nombre: "claro",
    colores: {
      accion: "#1F4E9C",
      confirmado: "#1A6B3C",
      peligro: "#D91023",
      peligroOscuro: "#9E0B18",
      aviso: "#FFF1C2",
      avisoTexto: "#3D2E00",
      texto: "#1B1B1B",
      textoSecundario: "#4A4A4A",
      fondo: "#FFFFFF",
      superficie: "#F4F1EA",
    },
    escalaLetra: 1,
  },
  emergencia: {
    nombre: "emergencia",
    colores: {
      accion: "#1F4E9C",
      confirmado: "#1A6B3C",
      peligro: "#D91023",
      peligroOscuro: "#9E0B18",
      aviso: "#FFF1C2",
      avisoTexto: "#3D2E00",
      texto: "#1B1B1B",
      textoSecundario: "#4A4A4A",
      fondo: "#FFFFFF",
      superficie: "#FFF1C2",
    },
    escalaLetra: 1.25,
  },
  oscuro: {
    nombre: "oscuro",
    colores: {
      accion: "#1F4E9C",
      confirmado: "#1A6B3C",
      peligro: "#D91023",
      peligroOscuro: "#9E0B18",
      aviso: "#FFF1C2",
      avisoTexto: "#3D2E00",
      texto: "#1B1B1B", // [A COMPLETAR] valor exacto de diseño.
      textoSecundario: "#4A4A4A", // [A COMPLETAR] valor exacto de diseño.
      fondo: "#FFFFFF", // [A COMPLETAR] valor exacto de diseño.
      superficie: "#F4F1EA", // [A COMPLETAR] valor exacto de diseño.
    },
    escalaLetra: 1.5,
  },
};

export function tamanoLetra(base: number, escala: TokensTema["escalaLetra"]): number {
  return Math.max(18, Math.round(base * escala));
}
