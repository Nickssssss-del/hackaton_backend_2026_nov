/**
 * Modelo. Categorías de Servicios del Mockup v4 (E1, p. 16) y tipos de negocio de E4 (p. 19).
 *
 * La base no cambia: cada categoría agrupa oficios que ya existen en `servicios.oficio`
 * (CHECK de la tabla). Así «Agua y luz» muestra gasfiteros y electricistas, y «Oficios» todo lo
 * que no cae en las otras cinco.
 */
import { OFICIOS, type Oficio, type ServicioPublico } from "./tipos";

export type ValorCategoriaServicio = "agua_luz" | "menu" | "bodegas" | "panaderias" | "farmacias" | "oficios";

export interface CategoriaServicio {
  valor: ValorCategoriaServicio;
  etiqueta: string;
  oficios: readonly Oficio[];
  /** Palabras que, dichas por voz, llevan a esta categoría («Decir qué busco»). */
  palabras: readonly string[];
}

const AGUA_LUZ: readonly Oficio[] = ["gasfitero", "electricista"];
const MENU: readonly Oficio[] = ["restaurante", "cafeteria"];
const BODEGAS: readonly Oficio[] = ["bodega", "mercado"];
const PANADERIAS: readonly Oficio[] = ["panaderia"];
const FARMACIAS: readonly Oficio[] = ["farmacia"];
const AGRUPADOS = new Set<Oficio>([...AGUA_LUZ, ...MENU, ...BODEGAS, ...PANADERIAS, ...FARMACIAS]);

export const CATEGORIAS_SERVICIO: readonly CategoriaServicio[] = [
  { valor: "agua_luz", etiqueta: "Agua y luz", oficios: AGUA_LUZ, palabras: ["agua", "luz", "gasfit", "caño", "tubo", "electric", "enchufe", "foco"] },
  { valor: "menu", etiqueta: "Menú del día", oficios: MENU, palabras: ["menú", "menu", "almuerzo", "comida", "comer", "restaurante", "cafe", "café", "desayuno"] },
  { valor: "bodegas", etiqueta: "Bodegas", oficios: BODEGAS, palabras: ["bodega", "mercado", "abarrote", "arroz", "azúcar", "azucar", "leche", "huevo"] },
  { valor: "panaderias", etiqueta: "Panaderías", oficios: PANADERIAS, palabras: ["pan", "panader", "pastel", "torta"] },
  { valor: "farmacias", etiqueta: "Farmacias", oficios: FARMACIAS, palabras: ["farmacia", "botica", "pastilla", "remedio", "medicina"] },
  {
    valor: "oficios",
    etiqueta: "Oficios",
    oficios: OFICIOS.filter((o) => !AGRUPADOS.has(o)),
    palabras: ["oficio", "carpint", "albañil", "albanil", "pintor", "cerraj", "costur", "zapat", "peluq", "lavand", "mecánic", "mecanic", "celular", "jardin", "mototaxi", "cuidad", "clases", "profesor"],
  },
];

export function categoriaServicio(valor: string | undefined): CategoriaServicio | undefined {
  return CATEGORIAS_SERVICIO.find((c) => c.valor === valor);
}

export function categoriaDeOficio(oficio: string): CategoriaServicio {
  return CATEGORIAS_SERVICIO.find((c) => (c.oficios as readonly string[]).includes(oficio)) ?? CATEGORIAS_SERVICIO[5];
}

/** Lo dicho por voz («¿Dónde compro pan?») → categoría; null si no se reconoce (se busca por texto). */
export function categoriaDeTexto(texto: string): CategoriaServicio | null {
  const t = texto.toLowerCase();
  // Primero las categorías más específicas: «pan» no debe caer en «oficios».
  for (const categoria of CATEGORIAS_SERVICIO) {
    if (categoria.palabras.some((p) => new RegExp(`\\b${p}`).test(t))) return categoria;
  }
  return null;
}

/** Nombre legible de cada oficio (con tildes; nunca el código). */
export const ETIQUETA_OFICIO: Record<Oficio, string> = {
  cafeteria: "Cafetería",
  bodega: "Bodega",
  panaderia: "Panadería",
  restaurante: "Menú",
  mercado: "Mercado",
  farmacia: "Farmacia",
  gasfitero: "Gasfitero",
  electricista: "Electricista",
  carpintero: "Carpintero",
  albanil: "Albañil",
  pintor: "Pintor",
  cerrajero: "Cerrajero",
  costurera: "Costurera",
  zapatero: "Zapatero",
  peluqueria: "Peluquería",
  lavanderia: "Lavandería",
  mecanico: "Mecánico",
  tecnico_celulares: "Técnico de celulares",
  jardinero: "Jardinero",
  mototaxi: "Mototaxi",
  cuidado_personas: "Cuidado de personas",
  clases_particulares: "Clases particulares",
  otro: "Otro",
};

export function etiquetaOficio(oficio: string): string {
  return ETIQUETA_OFICIO[oficio as Oficio] ?? "Servicio";
}

/** Nombre a mostrar: el del negocio; si no tiene, el del vecino; si no, el oficio. */
export function nombreServicio(s: Pick<ServicioPublico, "nombreNegocio" | "nombre" | "oficio">): string {
  return s.nombreNegocio?.trim() || s.nombre || etiquetaOficio(s.oficio);
}

/** E4 «Sube tu negocio»: los 5 tipos del mockup + «Otro», que abre la lista completa de oficios. */
export const TIPOS_NEGOCIO_V4: readonly { valor: Oficio | "mas"; etiqueta: string }[] = [
  { valor: "bodega", etiqueta: "Bodega" },
  { valor: "panaderia", etiqueta: "Panadería" },
  { valor: "gasfitero", etiqueta: "Gasfitero" },
  { valor: "restaurante", etiqueta: "Menú" },
  { valor: "farmacia", etiqueta: "Farmacia" },
  { valor: "mas", etiqueta: "Otro" },
];

/** Oficios que aparecen al tocar «Otro» en E4. */
export const OTROS_OFICIOS: readonly Oficio[] = OFICIOS.filter(
  (o) => !TIPOS_NEGOCIO_V4.some((t) => t.valor === o),
);
