import { leerJson, guardarJson } from "../almacen";
import type { UltimaUbicacion } from "../tipos";

export function leerUltimaUbicacion(): Promise<UltimaUbicacion | null> {
  return leerJson("ultimaUbicacion", null);
}

export function guardarUltimaUbicacion(ubicacion: UltimaUbicacion): Promise<void> {
  return guardarJson("ultimaUbicacion", ubicacion);
}
