import { leerJson, guardarJson } from "../almacen";

export interface Preferencias {
  tema?: "claro" | "emergencia" | "oscuro";
  escalaLetra?: 1 | 1.25 | 1.5;
  sonidos?: boolean;
}

export function leerPreferencias(): Promise<Preferencias> {
  return leerJson("preferencias", {});
}

export function guardarPreferencias(preferencias: Preferencias): Promise<void> {
  return guardarJson("preferencias", preferencias);
}
