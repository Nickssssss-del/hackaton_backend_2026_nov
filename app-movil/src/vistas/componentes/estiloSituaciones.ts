/**
 * Vista. Etiqueta, ícono y color de cada «¿Algo de esto te pasa?» (B4). La usan B4 y el Inicio.
 */
import type { Situacion } from "../../modelos/local/situaciones";
import type { ColorIcono } from "../tema/tokens";
import type { NombreIcono } from "./Icono";

export const SITUACIONES: { valor: Situacion; etiqueta: string; icono: NombreIcono; color: ColorIcono }[] = [
  { valor: "vivo_solo", etiqueta: "Vivo solo", icono: "account-outline", color: "morado" },
  { valor: "oigo_poco", etiqueta: "Oigo poco", icono: "ear-hearing", color: "turquesa" },
  { valor: "veo_poco", etiqueta: "Veo poco", icono: "eye-outline", color: "azul" },
  { valor: "camino_poco", etiqueta: "Camino poco", icono: "walk", color: "naranja" },
  { valor: "tomo_pastillas", etiqueta: "Tomo pastillas", icono: "pill", color: "verde" },
  { valor: "ninguna", etiqueta: "Ninguna", icono: "close", color: "gris" },
];
