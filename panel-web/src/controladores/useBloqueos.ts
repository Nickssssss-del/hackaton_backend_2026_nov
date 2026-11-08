/**
 * Controlador. Usuarios bloqueados y reportes de personas:
 * "Desbloquear", "Bloquear" (con motivo) y "Descartar reporte".
 */
import { useCallback, useEffect, useState } from "react";
import {
  bloquear,
  desbloquear,
  descartarReporte,
  idDeLaSesion,
  listarBloqueos,
  listarReportesDePersonas,
  type Bloqueo,
  type ReportePersona,
} from "../modelos/bloqueos";
import { mensajeDeError } from "./errores";

export function useBloqueos() {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [reportes, setReportes] = useState<ReportePersona[]>([]);
  const [miId, setMiId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [lista, dePersonas, yo] = await Promise.all([listarBloqueos(), listarReportesDePersonas(), idDeLaSesion()]);
      setBloqueos(lista);
      setReportes(dePersonas);
      setMiId(yo);
    } catch (causa) {
      setError(mensajeDeError(causa, "No se pudieron leer los bloqueos."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ejecutar = async (id: string, accion: () => Promise<void>, hecho: string, fallo: string) => {
    setEnCurso(id);
    setError(null);
    setAviso(null);
    try {
      await accion();
      setAviso(hecho);
      return true;
    } catch (causa) {
      setError(mensajeDeError(causa, fallo));
      return false;
    } finally {
      setEnCurso(null);
    }
  };

  const quitarBloqueo = async (userId: string) => {
    if (await ejecutar(userId, () => desbloquear(userId), "Usuario desbloqueado.", "No se pudo desbloquear.")) {
      setBloqueos((lista) => lista.filter((b) => b.user_id !== userId));
    }
  };

  /** Devuelve true si quedó bloqueado; recarga la lista para mostrar el bloqueo nuevo. */
  const bloquearUsuario = async (userId: string, motivo: string) => {
    const hecho = await ejecutar(userId, () => bloquear(userId, motivo), "Usuario bloqueado.", "No se pudo bloquear.");
    if (hecho) setBloqueos(await listarBloqueos().catch(() => bloqueos));
    return hecho;
  };

  const descartar = async (id: string) => {
    if (await ejecutar(id, () => descartarReporte(id), "Reporte descartado.", "No se pudo descartar el reporte.")) {
      setReportes((lista) => lista.filter((r) => r.id !== id));
    }
  };

  const bloqueados = new Set(bloqueos.map((b) => b.user_id));

  return {
    bloqueos,
    reportes,
    bloqueados,
    miId,
    cargando,
    error,
    aviso,
    enCurso,
    recargar: cargar,
    quitarBloqueo,
    bloquearUsuario,
    descartar,
  };
}
