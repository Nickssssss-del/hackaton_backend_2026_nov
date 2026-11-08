// Las 6 funciones que la IA puede pedir y la validación de todo lo que cruza la función:
// lo que manda la app (validarEntrada) y lo que devuelve la IA (validarLlamada, validarTexto).
// Contrato: backend/docs/spec_preguntale.md

// Lista cerrada de oficios: la misma del CHECK de servicios.oficio (01_tablas.sql).
export const OFICIOS = [
  "cafeteria", "bodega", "panaderia", "restaurante", "mercado", "farmacia",
  "gasfitero", "electricista", "carpintero", "albanil", "pintor", "cerrajero",
  "costurera", "zapatero", "peluqueria", "lavanderia", "mecanico",
  "tecnico_celulares", "jardinero", "mototaxi", "cuidado_personas",
  "clases_particulares", "otro",
] as const;

// Las categorías del CHECK de pedidos_ayuda.categoria (01_tablas.sql).
export const CATEGORIAS_AYUDA = ["arreglos", "compras", "transporte", "salud"] as const;

export type NombreFuncion =
  | "buscar_servicio"
  | "crear_recordatorio"
  | "ver_mi_horario"
  | "pedir_ayuda"
  | "llamar"
  | "como_llegar";

export interface Herramienta {
  nombre: NombreFuncion;
  descripcion: string;
  parametros: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}

export interface LlamadaValida {
  funcion: NombreFuncion;
  argumentos: Record<string, string | boolean>;
  confirmar: boolean;
}

export interface Boton {
  etiqueta: string;
  funcion: NombreFuncion | null;
  argumentos: Record<string, string>;
}

export interface Respuesta {
  texto: string;
  funcion: NombreFuncion | null;
  argumentos: Record<string, string | boolean>;
  confirmar: boolean;
  servicios?: unknown[];
  botones: Boton[];
}

export interface Entrada {
  texto: string;
  lat?: number;
  lng?: number;
  zona_id?: string;
}

// Definiciones en JSON Schema, neutras al proveedor: llamarIA() las adapta.
export const HERRAMIENTAS: Herramienta[] = [
  {
    nombre: "buscar_servicio",
    descripcion: "Busca oficios o negocios del barrio, por ejemplo un gasfitero o una farmacia.",
    parametros: {
      type: "object",
      properties: {
        oficio: { type: "string", enum: [...OFICIOS] },
        abierto_ahora: { type: "boolean", description: "Solo si la persona pide que esté abierto." },
      },
      required: ["oficio"],
    },
  },
  {
    nombre: "crear_recordatorio",
    descripcion: "Crea un recordatorio, por ejemplo para tomar una pastilla.",
    parametros: {
      type: "object",
      properties: {
        que: { type: "string", maxLength: 60, description: "Qué recordar, en pocas palabras." },
        hora: { type: "string", pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$", description: "Hora en formato 24 h, HH:MM." },
        repetir: { type: "string", enum: ["diario", "una_vez"] },
      },
      required: ["que", "hora", "repetir"],
    },
  },
  {
    nombre: "ver_mi_horario",
    descripcion: "Muestra el horario de pastillas y recordatorios de la persona.",
    parametros: { type: "object", properties: {} },
  },
  {
    nombre: "pedir_ayuda",
    descripcion: "Pide ayuda a los vecinos de la zona.",
    parametros: {
      type: "object",
      properties: {
        categoria: { type: "string", enum: [...CATEGORIAS_AYUDA] },
        descripcion: { type: "string", maxLength: 140, description: "Qué necesita, sin enlaces." },
      },
      required: ["categoria"],
    },
  },
  {
    nombre: "llamar",
    descripcion: "Llama a un contacto de la persona (por ejemplo, «mi hija») o a un servicio ya mostrado.",
    parametros: {
      type: "object",
      properties: {
        a_quien: { type: "string", maxLength: 60 },
        servicio_id: { type: "string", format: "uuid" },
      },
    },
  },
  {
    nombre: "como_llegar",
    descripcion: "Indica cómo llegar a un servicio ya mostrado o a un lugar.",
    parametros: {
      type: "object",
      properties: {
        servicio_id: { type: "string", format: "uuid" },
        destino: { type: "string", maxLength: 100 },
      },
    },
  },
];

export const BOTONES_BASE: Boton[] = [
  { etiqueta: "Servicios", funcion: null, argumentos: {} },
  { etiqueta: "Pastillas", funcion: null, argumentos: {} },
  { etiqueta: "Ayuda", funcion: null, argumentos: {} },
];

const ENLACE = /https?:\/\/|www\./i;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Texto limpio de 1 a `max` caracteres, sin enlaces; si no, null. */
function textoCorto(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!limpio || limpio.length > max || ENLACE.test(limpio)) return null;
  return limpio;
}

/** Exactamente uno de servicio_id (uuid) o `campo` (texto ≤ max). */
function servicioOTexto(a: Record<string, unknown>, campo: string, max: number) {
  const tieneId = a.servicio_id !== undefined;
  const tieneTexto = a[campo] !== undefined;
  if (tieneId === tieneTexto) return null;
  if (tieneId) {
    return typeof a.servicio_id === "string" && UUID.test(a.servicio_id) ? { servicio_id: a.servicio_id } : null;
  }
  const texto = textoCorto(a[campo], max);
  return texto ? { [campo]: texto } : null;
}

const VALIDADORES: Record<NombreFuncion, (a: Record<string, unknown>) => Record<string, string | boolean> | null> = {
  buscar_servicio(a): Record<string, string | boolean> | null {
    if (!(OFICIOS as readonly unknown[]).includes(a.oficio)) return null;
    if (a.abierto_ahora === undefined) return { oficio: a.oficio as string };
    return typeof a.abierto_ahora === "boolean" ? { oficio: a.oficio as string, abierto_ahora: a.abierto_ahora } : null;
  },
  crear_recordatorio(a) {
    const que = textoCorto(a.que, 60);
    if (!que || typeof a.hora !== "string" || !HORA.test(a.hora)) return null;
    if (a.repetir !== "diario" && a.repetir !== "una_vez") return null;
    return { que, hora: a.hora, repetir: a.repetir };
  },
  ver_mi_horario() {
    return {};
  },
  pedir_ayuda(a): Record<string, string | boolean> | null {
    if (!(CATEGORIAS_AYUDA as readonly unknown[]).includes(a.categoria)) return null;
    if (a.descripcion === undefined) return { categoria: a.categoria as string };
    const descripcion = textoCorto(a.descripcion, 140);
    return descripcion ? { categoria: a.categoria as string, descripcion } : null;
  },
  llamar: (a) => servicioOTexto(a, "a_quien", 60),
  como_llegar: (a) => servicioOTexto(a, "destino", 100),
};

const CREAN_ALGO: NombreFuncion[] = ["crear_recordatorio", "pedir_ayuda"];

/** Valida el nombre y los argumentos que pidió la IA. Descarta claves que sobren. Null = no entiende. */
export function validarLlamada(nombre: unknown, argumentos: unknown): LlamadaValida | null {
  if (typeof nombre !== "string" || !Object.hasOwn(VALIDADORES, nombre)) return null;
  if (typeof argumentos !== "object" || argumentos === null || Array.isArray(argumentos)) return null;
  const funcion = nombre as NombreFuncion;
  const validos = VALIDADORES[funcion](argumentos as Record<string, unknown>);
  return validos ? { funcion, argumentos: validos, confirmar: CREAN_ALGO.includes(funcion) } : null;
}

/**
 * Valida el cuerpo que manda la app. La ubicación va a 3 decimales y solo si está completa.
 * Una ubicación o un zona_id inválidos se ignoran: la pregunta sigue sirviendo sin ellos.
 */
export function validarEntrada(cuerpo: unknown): Entrada | null {
  if (typeof cuerpo !== "object" || cuerpo === null) return null;
  const { texto, lat, lng, zona_id } = cuerpo as Record<string, unknown>;
  if (typeof texto !== "string") return null;
  const limpio = texto.trim();
  if (!limpio || limpio.length > 300) return null;

  const entrada: Entrada = { texto: limpio };
  const valida = (v: unknown, limite: number) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limite;
  if (valida(lat, 90) && valida(lng, 180)) {
    const redondeo = (v: number) => Math.round(v * 1000) / 1000;
    entrada.lat = redondeo(lat as number);
    entrada.lng = redondeo(lng as number);
  }
  if (typeof zona_id === "string" && UUID.test(zona_id)) entrada.zona_id = zona_id;
  return entrada;
}

/** Texto para leer en voz alta: recortado a 140 y sin enlaces. Null si no sirve. */
export function validarTexto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!limpio || ENLACE.test(limpio)) return null;
  return limpio.slice(0, 140);
}

export function noEntiende(texto = "No te entendí. ¿Qué necesitas?"): Respuesta {
  return { texto, funcion: null, argumentos: {}, confirmar: false, botones: BOTONES_BASE };
}
