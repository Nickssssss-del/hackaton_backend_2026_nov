/**
 * Vista. Ícono y color de cada categoría y oficio de Servicios (Mockup v4, pp. 16–19):
 * Agua y luz azul, Menú del día naranja, Bodegas turquesa, Panaderías amarillo,
 * Farmacias verde, Oficios morado.
 */
import { categoriaDeOficio, type ValorCategoriaServicio } from "../../modelos/categoriasServicio";
import type { Oficio } from "../../modelos/tipos";
import type { ColorIcono } from "../tema/tokens";
import type { NombreIcono } from "./Icono";

type Estilo = { icono: NombreIcono; color: ColorIcono };

export const ESTILO_CATEGORIA_SERVICIO: Record<ValorCategoriaServicio, Estilo> = {
  agua_luz: { icono: "water-outline", color: "azul" },
  menu: { icono: "silverware-fork-knife", color: "naranja" },
  bodegas: { icono: "store-outline", color: "turquesa" },
  panaderias: { icono: "baguette", color: "amarillo" },
  farmacias: { icono: "medical-bag", color: "verde" },
  oficios: { icono: "wrench-outline", color: "morado" },
};

/** Algunos oficios tienen ícono propio; el resto toma el de su categoría. */
const ICONO_OFICIO: Partial<Record<Oficio, Estilo>> = {
  gasfitero: { icono: "pipe-wrench", color: "morado" },
  electricista: { icono: "lightning-bolt-outline", color: "azul" },
  cafeteria: { icono: "coffee-outline", color: "naranja" },
  mercado: { icono: "cart-outline", color: "turquesa" },
  pago_servicios: { icono: "cash-multiple", color: "azul" },
};

export function estiloOficio(oficio: string): Estilo {
  return ICONO_OFICIO[oficio as Oficio] ?? ESTILO_CATEGORIA_SERVICIO[categoriaDeOficio(oficio).valor];
}
