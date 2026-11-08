/**
 * Controlador. Emergencias cerradas de los últimos 7 días, solo lectura.
 */
import { useCallback, useEffect, useState } from "react";
import { listarEmergenciasCerradas, type EmergenciaCerrada } from "../modelos/emergenciasCerradas";
import { mensajeDeError } from "./errores";

export function useEmergenciasCerradas() {
  const [emergencias, setEmergencias] = useState<EmergenciaCerrada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setEmergencias(await listarEmergenciasCerradas());
    } catch (causa) {
      setError(mensajeDeError(causa, "No se pudieron leer las emergencias cerradas."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { emergencias, cargando, error, recargar: cargar };
}
