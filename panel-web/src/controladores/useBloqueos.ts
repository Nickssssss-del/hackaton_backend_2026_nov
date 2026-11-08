/**
 * Controlador. Personas reportadas por decidir («Bloquear» con motivo, «Descartar»)
 * y personas bloqueadas («Desbloquear»).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bloquear,
  desbloquear,
  descartarReportes,
  idDeLaSesion,
  listarBloqueos,
  listarReportesDePersonas,
  type Bloqueo,
  type ReportePersona,
} from "../modelos/bloqueos";
import { mensajeDeError } from "./errores";
import { avisarCambio } from "./eventos";

/** Todos los reportes a una misma persona, juntos. */
export interface PersonaReportada {
  usuario_id: string;
  nombre: string | null;
  contexto: string | null;
  motivos: { motivo: string; cantidad: number }[];
  ids: string[];
  ultimo: string;
}

function agrupar(reportes: ReportePersona[], bloqueados: Set<string>): PersonaReportada[] {
  const porPersona = new Map<string, PersonaReportada>();
  for (const r of reportes) {
    if (bloqueados.has(r.usuario_id)) continue;
    const p = porPersona.get(r.usuario_id) ?? {
      usuario_id: r.usuario_id,
      nombre: r.nombre ?? null,
      contexto: r.contexto ?? null,
      motivos: [],
      ids: [],
      ultimo: r.creado_en,
    };
    p.ids.push(r.id);
    if (Date.parse(r.creado_en) > Date.parse(p.ultimo)) p.ultimo = r.creado_en;
    const m = p.motivos.find((x) => x.motivo === r.motivo);
    if (m) m.cantidad += 1;
    else p.motivos.push({ motivo: r.motivo, cantidad: 1 });
    porPersona.set(r.usuario_id, p);
  }
  return [...porPersona.values()].sort((a, b) => Date.parse(b.ultimo) - Date.parse(a.ultimo));
}

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
      avisarCambio();
      return true;
    } catch (causa) {
      setError(mensajeDeError(causa, fallo));
      return false;
    } finally {
      setEnCurso(null);
    }
  };

  const quitarBloqueo = async (userId: string) => {
    if (await ejecutar(userId, () => desbloquear(userId), "Persona desbloqueada.", "No se pudo desbloquear.")) {
      setBloqueos((lista) => lista.filter((b) => b.user_id !== userId));
    }
  };

  /** Devuelve true si quedó bloqueado; recarga la lista para mostrar el bloqueo nuevo. */
  const bloquearPersona = async (userId: string, motivo: string) => {
    const hecho = await ejecutar(userId, () => bloquear(userId, motivo), "Persona bloqueada.", "No se pudo bloquear.");
    if (hecho) {
      const [lista, dePersonas] = await Promise.all([
        listarBloqueos().catch(() => bloqueos),
        listarReportesDePersonas().catch(() => reportes),
      ]);
      setBloqueos(lista);
      setReportes(dePersonas);
    }
    return hecho;
  };

  /** Descarta todos los reportes a esa persona. */
  const descartar = async (persona: PersonaReportada) => {
    const hecho = await ejecutar(
      persona.usuario_id,
      () => descartarReportes(persona.ids),
      "Reportes descartados.",
      "No se pudieron descartar los reportes.",
    );
    if (hecho) setReportes((lista) => lista.filter((r) => !persona.ids.includes(r.id)));
  };

  const porDecidir = useMemo(() => agrupar(reportes, new Set(bloqueos.map((b) => b.user_id))), [reportes, bloqueos]);

  return {
    bloqueos,
    porDecidir,
    miId,
    cargando,
    error,
    aviso,
    enCurso,
    recargar: cargar,
    quitarBloqueo,
    bloquearPersona,
    descartar,
  };
}
