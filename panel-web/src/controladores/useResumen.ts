/**
 * Controlador. Totales del día, solo lectura.
 */
import { useCallback, useEffect, useState } from "react";
import { leerResumen, type ResumenDia } from "../modelos/resumen";
import { mensajeDeError } from "./errores";

export function useResumen() {
  const [resumen, setResumen] = useState<ResumenDia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setResumen(await leerResumen());
    } catch (causa) {
      setError(mensajeDeError(causa, "No se pudo leer el resumen del día."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { resumen, cargando, error, recargar: cargar };
}
