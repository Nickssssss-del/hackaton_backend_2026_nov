/**
 * Vista. Textos legibles para los códigos que guarda la base.
 */
const MOTIVOS: Record<string, string> = {
  estafa: "Estafa",
  datos_falsos: "Datos falsos",
  ofensivo: "Ofensivo",
  no_existe: "No existe",
  otro: "Otro",
};

const TIPOS_GRUPO: Record<string, string> = {
  brigada: "Brigada",
  bomberos: "Bomberos",
  comisaria: "Comisaría",
  salud: "Salud",
  municipalidad: "Municipalidad",
  punto_seguro: "Punto seguro",
  otro: "Otro",
};

const legible = (codigo: string) => {
  const texto = codigo.replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

export const motivoReporte = (codigo: string) => MOTIVOS[codigo] ?? legible(codigo);

const MOTIVOS_COMUNIDAD: Record<string, string> = {
  abuso: "Abuso",
  spam: "Spam",
  falso: "Falso",
  ofensivo: "Ofensivo",
  otro: "Otro",
};

const CATEGORIAS_PUBLICACION: Record<string, string> = {
  kermes: "Kermés",
  misa: "Misa",
  ayuda_social: "Ayuda social",
  donacion: "Donación",
  taller: "Taller",
  otro: "Otro",
};

export const motivoComunidad = (codigo: string) => MOTIVOS_COMUNIDAD[codigo] ?? legible(codigo);
export const categoriaPublicacion = (codigo: string) => CATEGORIAS_PUBLICACION[codigo] ?? legible(codigo);

/** El admin no lee perfiles ajenos: se identifica a la persona con un id corto. */
export const idCorto = (id: string) => `Usuario ${id.slice(0, 4)}…${id.slice(-3)}`;
export const tipoGrupo = (codigo: string) => TIPOS_GRUPO[codigo] ?? legible(codigo);
export const oficio = legible;

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

export const fecha = (iso: string) => formatoFecha.format(new Date(iso));

const formatoHora = new Intl.DateTimeFormat("es-PE", { timeStyle: "short", timeZone: "America/Lima" });

export const hora = (iso: string) => formatoHora.format(new Date(iso));

const ESTADOS_ESLABON: Record<string, string> = {
  pendiente: "Pendiente",
  llamando: "Llamando",
  no_contesto: "No contestó",
  hablamos: "Hablamos",
  va_en_camino: "Va en camino",
};

export const estadoEslabon = (codigo: string) => ESTADOS_ESLABON[codigo] ?? legible(codigo);

/** «vence en 12 min», o «vence en menos de 1 min». */
export function venceEn(expiraIso: string, ahora: number): string {
  const minutos = Math.floor((Date.parse(expiraIso) - ahora) / 60_000);
  return minutos < 1 ? "vence en menos de 1 min" : `vence en ${minutos} min`;
}
