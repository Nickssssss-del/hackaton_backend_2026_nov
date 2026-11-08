/**
 * Controlador. Emergencias activas en tiempo real, solo lectura.
 * Si Realtime no conecta, recarga cada 15 s como respaldo.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { escucharEmergencias, listarEmergenciasActivas, type EmergenciaActiva } from "../modelos/emergencias";
import { mensajeDeError } from "./errores";

const ESPERA_RAFAGA_MS = 300;
const CADA_MS = 15_000;

export function useEmergenciasActivas() {
  const [emergencias, setEmergencias] = useState<EmergenciaActiva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** null mientras conecta. */
  const [enVivo, setEnVivo] = useState<boolean | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const enVivoRef = useRef<boolean | null>(null);

  const cargar = useCallback(async () => {
    try {
      setEmergencias(await listarEmergenciasActivas());
      setError(null);
    } catch (causa) {
      setError(mensajeDeError(causa, "No se pudieron leer las emergencias activas."));
    } finally {
      setCargando(false);
      setAhora(Date.now());
    }
  }, []);

  useEffect(() => {
    void cargar();

    // Varias filas cambian juntas (emergencia + eslabones): se junta la ráfaga en una sola lectura.
    let rafaga: ReturnType<typeof setTimeout> | undefined;
    const alCambiar = () => {
      clearTimeout(rafaga);
      rafaga = setTimeout(() => void cargar(), ESPERA_RAFAGA_MS);
    };
    let dejar = () => {};
    try {
      dejar = escucharEmergencias(alCambiar, (vivo) => {
        enVivoRef.current = vivo;
        setEnVivo(vivo);
      });
    } catch {
      enVivoRef.current = false;
      setEnVivo(false);
    }

    // Recalcula «vence en» y saca las vencidas; sin Realtime, además recarga.
    const reloj = setInterval(() => {
      setAhora(Date.now());
      if (enVivoRef.current === false) void cargar();
    }, CADA_MS);

    return () => {
      clearTimeout(rafaga);
      clearInterval(reloj);
      dejar();
    };
  }, [cargar]);

  const vigentes = emergencias.filter((e) => Date.parse(e.expira_en) > ahora);

  const recargar = useCallback(() => {
    setCargando(true);
    void cargar();
  }, [cargar]);

  return { emergencias: vigentes, cargando, error, enVivo, ahora, recargar };
}
