/**
 * Modelo. Tipos, categorías y textos de Comunidad (F2, F3). Valores del CHECK de
 * publicaciones.categoria y reportes_comunidad.motivo (script 07).
 */

export const CATEGORIAS_PUBLICACION = ["kermes", "misa", "ayuda_social", "donacion", "taller", "otro"] as const;
export type CategoriaPublicacion = (typeof CATEGORIAS_PUBLICACION)[number];

export const ETIQUETA_PUBLICACION: Record<CategoriaPublicacion, string> = {
  kermes: "Kermés",
  misa: "Misa",
  ayuda_social: "Ayuda social",
  donacion: "Donación",
  taller: "Taller",
  otro: "Otro",
};

export const MOTIVOS_REPORTE_COMUNIDAD = ["abuso", "spam", "falso", "ofensivo", "otro"] as const;
export type MotivoReporteComunidad = (typeof MOTIVOS_REPORTE_COMUNIDAD)[number];

export const ETIQUETA_MOTIVO_COMUNIDAD: Record<MotivoReporteComunidad, string> = {
  abuso: "Es un abuso",
  spam: "Es publicidad o se repite",
  falso: "Es falso",
  ofensivo: "Es ofensivo",
  otro: "Otro motivo",
};

export interface Publicacion {
  id: string;
  autorCorto: string;
  categoria: CategoriaPublicacion;
  mensaje: string;
  fotoPath?: string;
  creadoEn: string;
  antiguedad: string;
  asistentes: number;
  voy: boolean;
  comentarios: number;
  esMia: boolean;
}

export type DestinoReporte = { publicacionId: string } | { comentarioId: string };
