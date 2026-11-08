/**
 * Controlador. Nombres de las zonas para el filtro «Zona».
 */
import { useEffect, useState } from "react";
import { listarZonas } from "../modelos/zonas";

export function useZonas() {
  const [zonas, setZonas] = useState<string[]>([]);

  useEffect(() => {
    let vigente = true;
    listarZonas()
      .then((lista) => vigente && setZonas(lista.map((z) => z.nombre)))
      .catch(() => vigente && setZonas([]));
    return () => {
      vigente = false;
    };
  }, []);

  return zonas;
}
