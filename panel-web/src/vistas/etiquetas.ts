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
export const tipoGrupo = (codigo: string) => TIPOS_GRUPO[codigo] ?? legible(codigo);
export const oficio = legible;

const formatoFecha = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
});

export const fecha = (iso: string) => formatoFecha.format(new Date(iso));
