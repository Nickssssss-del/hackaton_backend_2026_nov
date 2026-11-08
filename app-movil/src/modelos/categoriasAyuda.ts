/**
 * Modelo. Categorías de «Ayuda entre vecinos» (F1, Mockup v4): texto en pantalla → valor en la base.
 *
 * Alineado con backend/database/07_mockup_v4.sql (CHECK de pedidos_ayuda.categoria):
 * 'arreglos', 'compras', 'transporte', 'salud', 'desastre_natural', 'apoyo'.
 * - «Una manito» (antes «Compañía» en el mockup) se guarda como 'transporte' (decisión D-05 del
 *   equipo, confirmada el 8-nov). No se usa 'apoyo' aunque la base lo acepte; si llega algún pedido
 *   antiguo con 'apoyo', también se muestra como «Una manito».
 * - «Desastre natural» se guarda como 'desastre_natural': ya existe en la base.
 */
import type { CategoriaPedido } from "./tipos";

/** Valor que se guarda en pedidos_ayuda.categoria. */
export type ValorCategoriaAyuda = CategoriaPedido;

export interface DefinicionCategoriaAyuda {
  valor: ValorCategoriaAyuda;
  etiqueta: string;
  ayuda?: string;
  /** true si la restricción de pedidos_ayuda.categoria acepta el valor (todas desde el script 07). */
  disponibleEnBase: boolean;
}

/** Las 4 tarjetas de F1, en el orden del mockup. */
export const CATEGORIAS_AYUDA_V4: readonly DefinicionCategoriaAyuda[] = [
  { valor: "desastre_natural", etiqueta: "Desastre natural", ayuda: "sismo o lluvia", disponibleEnBase: true },
  { valor: "salud", etiqueta: "Salud", disponibleEnBase: true },
  { valor: "compras", etiqueta: "Compras", disponibleEnBase: true },
  { valor: "transporte", etiqueta: "Una manito", disponibleEnBase: true },
];

const OTRAS: Record<string, string> = {
  arreglos: "Arreglos",
  apoyo: "Una manito",
};

/** Texto en pantalla para cualquier valor guardado, incluidos los anteriores al Mockup v4. */
export function etiquetaCategoriaAyuda(valor: ValorCategoriaAyuda): string {
  const v4 = CATEGORIAS_AYUDA_V4.find((c) => c.valor === valor);
  if (v4) return v4.etiqueta;
  return OTRAS[valor] ?? valor;
}
