/**
 * Vista. Ícono y color de cada categoría de «Ayuda entre vecinos» (Mockup v4, p. 20):
 * Desastre natural rojo, Salud verde, Compras naranja, Una manito morado.
 */
import type { ValorCategoriaAyuda } from "../../modelos/categoriasAyuda";
import type { ColorIcono } from "../tema/tokens";
import type { NombreIcono } from "./Icono";

export const ESTILO_CATEGORIA: Record<ValorCategoriaAyuda, { icono: NombreIcono; color: ColorIcono }> = {
  desastre_natural: { icono: "pulse", color: "rojo" },
  salud: { icono: "plus-outline", color: "verde" },
  compras: { icono: "store-outline", color: "naranja" },
  transporte: { icono: "account-multiple-outline", color: "morado" },
  arreglos: { icono: "hammer-wrench", color: "azul" },
};
