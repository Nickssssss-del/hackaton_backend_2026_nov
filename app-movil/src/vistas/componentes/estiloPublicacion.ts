/**
 * Vista. Ícono y color de cada categoría de Comunidad (F2, F3).
 */
import type { CategoriaPublicacion } from "../../modelos/comunidad";
import type { ColorIcono } from "../tema/tokens";
import type { NombreIcono } from "./Icono";

export const ESTILO_PUBLICACION: Record<CategoriaPublicacion, { icono: NombreIcono; color: ColorIcono }> = {
  kermes: { icono: "party-popper", color: "naranja" },
  misa: { icono: "church", color: "morado" },
  ayuda_social: { icono: "hand-heart-outline", color: "verde" },
  donacion: { icono: "gift-outline", color: "rojo" },
  taller: { icono: "school-outline", color: "azul" },
  otro: { icono: "bullhorn-outline", color: "turquesa" },
};
