/**
 * Vista. Textos legibles para los códigos que guarda la base, y formatos de fecha.
 */
const legible = (codigo: string) => {
  const texto = codigo.replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const MOTIVOS: Record<string, string> = {
  estafa: "Estafa",
  datos_falsos: "Datos falsos",
  ofensivo: "Ofensivo",
  no_existe: "No existe",
  cobro_abusivo: "Cobro abusivo",
  otro: "Otro",
};

const MOTIVOS_COMUNIDAD: Record<string, string> = {
  abuso: "Abuso",
  spam: "Spam",
  falso: "Falso",
  ofensivo: "Ofensivo",
  pidio_dinero: "Pidió dinero",
  acusa_persona: "Acusa a una persona",
  otro: "Otro",
};

const CATEGORIAS_PUBLICACION: Record<string, string> = {
  kermes: "Kermés",
  misa: "Misa",
  ayuda_social: "Ayuda social",
  donacion: "Donación",
  taller: "Taller",
  seguridad: "Seguridad",
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

export const motivoReporte = (codigo: string) => MOTIVOS[codigo] ?? legible(codigo);
export const motivoComunidad = (codigo: string) => MOTIVOS_COMUNIDAD[codigo] ?? legible(codigo);
export const categoriaPublicacion = (codigo: string) => CATEGORIAS_PUBLICACION[codigo] ?? legible(codigo);
export const tipoGrupo = (codigo: string) => TIPOS_GRUPO[codigo] ?? legible(codigo);
export const oficio = legible;

/** Motivos que puede elegir el admin al bloquear (se guardan como texto). */
export const MOTIVOS_BLOQUEO = [
  "Pidió dinero",
  "Spam",
  "Trato ofensivo",
  "Acusó a una persona sin pruebas",
  "Datos falsos",
  "Abusó de los datos de una emergencia",
  "Otro",
];

/** El admin no lee perfiles ajenos: se identifica a la persona con un id corto. */
export const idCorto = (id: string) => `${id.replace(/-/g, "").slice(0, 4)}…${id.replace(/-/g, "").slice(-4)}`;
export const nombrePersona = (nombre: string | null | undefined, id: string) => nombre ?? `Usuario ${id.slice(0, 4)}`;
export const inicial = (texto: string) => texto.trim().charAt(0).toUpperCase() || "?";

/* ------------------------------------------------------------------ Fechas */

const ZONA_HORARIA = "America/Lima";

const formato = (opciones: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-PE", { timeZone: ZONA_HORARIA, ...opciones });

const fmtHora = formato({ hour: "2-digit", minute: "2-digit", hour12: false });
const fmtDia = formato({ year: "numeric", month: "2-digit", day: "2-digit" });
const fmtSemana = formato({ weekday: "short" });
const fmtDiaMes = formato({ day: "numeric", month: "short" });
const fmtLargo = formato({ weekday: "long", day: "numeric", month: "long" });
const fmtCompleto = formato({ dateStyle: "medium", timeStyle: "short" });

const sinPunto = (t: string) => t.replace(/\./g, "");
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const hora = (iso: string) => fmtHora.format(new Date(iso));
export const fecha = (iso: string) => fmtCompleto.format(new Date(iso));

/** Días entre la fecha y hoy, según el calendario de Lima (0 = hoy). */
function diasAtras(iso: string, ahora = Date.now()): number {
  const a = Date.parse(fmtDia.format(new Date(iso)).split("/").reverse().join("-"));
  const b = Date.parse(fmtDia.format(new Date(ahora)).split("/").reverse().join("-"));
  return Math.round((b - a) / 86_400_000);
}

/** «3 nov» */
export const diaMes = (iso: string) => sinPunto(fmtDiaMes.format(new Date(iso)));

/** «Sáb 7 nov» */
export const diaSemanaMes = (iso: string) =>
  `${mayuscula(sinPunto(fmtSemana.format(new Date(iso))))} ${diaMes(iso)}`;

/** «Hoy 10:15», «Ayer 19:40» o «3 nov 08:30». */
export function cuando(iso: string): string {
  const d = diasAtras(iso);
  const prefijo = d === 0 ? "Hoy" : d === 1 ? "Ayer" : diaMes(iso);
  return `${prefijo} ${hora(iso)}`;
}

/** «Domingo 8 de noviembre» */
export const fechaLarga = (iso: string) => mayuscula(fmtLargo.format(new Date(iso)).replace(",", ""));

/** «hace 4 min», «hace 1 h 5 min». */
export function haceTiempo(iso: string, ahora: number): string {
  const min = Math.max(0, Math.floor((ahora - Date.parse(iso)) / 60_000));
  if (min < 1) return "hace menos de 1 min";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
}

/** «vence en 12 min», o «vence en menos de 1 min». */
export function venceEn(expiraIso: string, ahora: number): string {
  const minutos = Math.floor((Date.parse(expiraIso) - ahora) / 60_000);
  if (minutos < 1) return "vence en menos de 1 min";
  if (minutos < 60) return `vence en ${minutos} min`;
  return `vence en ${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

/** Nombres cortos de los últimos 7 días; el último es «Hoy». */
export function ultimosSieteDias(ahora = Date.now()): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    if (i === 6) return "Hoy";
    const d = new Date(ahora - (6 - i) * 86_400_000);
    return mayuscula(sinPunto(fmtSemana.format(d)));
  });
}

/* ------------------------------------------------------ Cadena de llamadas */

/** Qué es cada eslabón según su nombre: un contacto, la posta o un servicio de emergencia. */
export function tipoEslabon(contacto: string | null): string {
  if (!contacto) return "Contacto";
  if (/posta|centro de salud|hospital|cl[ií]nica/i.test(contacto)) return "Posta más cercana";
  if (/samu|comisar|bomber|serenazgo|polic/i.test(contacto)) return "Servicio de emergencia";
  return "Contacto";
}

/** Texto y tono del estado de un eslabón. `resuelto` = alguien antes ya contestó. */
export function estadoEslabon(codigo: string, resuelto: boolean): { texto: string; tono: "rojo" | "verde" | "gris" } {
  switch (codigo) {
    case "llamando":
      return { texto: "Llamando…", tono: "rojo" };
    case "no_contesto":
      return { texto: "No contestó", tono: "gris" };
    case "hablamos":
      return { texto: "Contestó", tono: "verde" };
    case "va_en_camino":
      return { texto: "Va en camino", tono: "verde" };
    case "pendiente":
      return { texto: resuelto ? "No hizo falta" : "En espera", tono: "gris" };
    default:
      return { texto: legible(codigo), tono: "gris" };
  }
}
