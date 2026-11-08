/**
 * Controlador. Resumen del tiempo de uso de los últimos 7 días.
 */
import { useCallback, useEffect, useState } from "react";
import { leerUsoSemana, resumirUso, type ResumenUso } from "../modelos/tiempoUso";
import { mensajeDeError } from "./errores";

export function useTiempoUso() {
  const [resumen, setResumen] = useState<ResumenUso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { filas, zonas } = await leerUsoSemana();
      setResumen(resumirUso(filas, zonas));
    } catch (causa) {
      setError(mensajeDeError(causa, "No se pudo leer el tiempo de uso."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { resumen, cargando, error, recargar: cargar };
}
