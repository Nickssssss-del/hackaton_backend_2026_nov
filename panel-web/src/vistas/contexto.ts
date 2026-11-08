/**
 * Vista. Estado compartido del panel: zona elegida, lista de zonas,
 * lo que espera revisión y cómo ir a otra pantalla.
 */
import { createContext, useContext } from "react";
import type { Pendientes } from "../controladores/usePendientes";

export type IdPantalla =
  | "resumen"
  | "activas"
  | "cerradas"
  | "servicios"
  | "comunidad"
  | "bloqueos"
  | "grupos";

export interface ContextoPanel {
  zona: string;
  zonas: string[];
  fijarZona: (zona: string) => void;
  pendientes: Pendientes;
  irA: (pantalla: IdPantalla) => void;
  correo: string | null;
}

export const Panel = createContext<ContextoPanel | null>(null);

export function usePanel(): ContextoPanel {
  const valor = useContext(Panel);
  if (!valor) throw new Error("usePanel fuera del panel");
  return valor;
}
