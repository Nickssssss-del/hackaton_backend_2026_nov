/**
 * Modelo. Categorías de «Ayuda entre vecinos» (F1, Mockup v4): texto en pantalla → valor en la base.
 *
 * Decisiones del equipo (7-nov-2026):
 * - La tarjeta «Compañía» del mockup se llama «Una manito» en pantalla (decisión definitiva) y se
 *   guarda como 'transporte', valor que YA EXISTE en pedidos_ayuda.categoria. No hay valor 'apoyo'.
 * - «Desastre natural» se guarda como 'desastre_natural', valor que NO existe todavía: está
 *   propuesto en docs/propuestas/sql_comunidad_vecinos_borrador.sql. Hasta que se aplique,
 *   `disponibleEnBase` es false y la pantalla F1 no debe enviarlo.
 */
import type { CategoriaPedido } from "./tipos";

/** Valor que se guarda en pedidos_ayuda.categoria. */
export type ValorCategoriaAyuda = CategoriaPedido | "desastre_natural";

export interface DefinicionCategoriaAyuda {
  valor: ValorCategoriaAyuda;
  etiqueta: string;
  ayuda?: string;
  /** true si la restricción actual de pedidos_ayuda.categoria ya acepta el valor. */
  disponibleEnBase: boolean;
}

/** Las 4 tarjetas de F1, en el orden del mockup. */
export const CATEGORIAS_AYUDA_V4: readonly DefinicionCategoriaAyuda[] = [
  { valor: "desastre_natural", etiqueta: "Desastre natural", ayuda: "sismo o lluvia", disponibleEnBase: false },
  { valor: "salud", etiqueta: "Salud", disponibleEnBase: true },
  { valor: "compras", etiqueta: "Compras", disponibleEnBase: true },
  { valor: "transporte", etiqueta: "Una manito", disponibleEnBase: true },
];

/** Texto en pantalla para cualquier valor guardado, incluidos los anteriores al Mockup v4. */
export function etiquetaCategoriaAyuda(valor: ValorCategoriaAyuda): string {
  const v4 = CATEGORIAS_AYUDA_V4.find((c) => c.valor === valor);
  if (v4) return v4.etiqueta;
  return valor === "arreglos" ? "Arreglos" : valor;
}
