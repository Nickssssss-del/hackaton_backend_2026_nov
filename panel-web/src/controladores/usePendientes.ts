/**
 * Controlador. Lo que espera revisión, para la barra lateral y «Por revisar».
 * Se recalcula al cambiar de pantalla, tras cada acción del admin y cada minuto.
 */
import { useCallback, useEffect, useState } from "react";
import { listarIdsBloqueados, listarReportesDePersonas } from "../modelos/bloqueos";
import { listarComentariosOcultos, listarPublicacionesOcultas } from "../modelos/comunidadOculta";
import { listarEmergenciasActivas, type EmergenciaActiva } from "../modelos/emergencias";
import { listarServiciosOcultos } from "../modelos/serviciosOcultos";
import { alCambiarDatos } from "./eventos";

export interface Pendientes {
  servicios: number;
  publicaciones: number;
  comentarios: number;
  /** Personas reportadas que nadie decidió todavía. */
  personas: number;
  emergencias: EmergenciaActiva[];
}

const VACIO: Pendientes = { servicios: 0, publicaciones: 0, comentarios: 0, personas: 0, emergencias: [] };

export const enZona = (zona: string) => (item: { zona: string | null }) => !zona || item.zona === zona;

export function usePendientes(zona: string, pantalla: string) {
  const [pendientes, setPendientes] = useState<Pendientes>(VACIO);

  const cargar = useCallback(async () => {
    const filtro = enZona(zona);
    const resultados = await Promise.allSettled([
      listarServiciosOcultos(),
      listarPublicacionesOcultas(),
      listarComentariosOcultos(),
      listarReportesDePersonas(),
      listarIdsBloqueados(),
      listarEmergenciasActivas(),
    ]);
    const [servicios, publicaciones, comentarios, reportes, bloqueados, emergencias] = resultados.map((r) =>
      r.status === "fulfilled" ? r.value : null,
    ) as [
      Awaited<ReturnType<typeof listarServiciosOcultos>> | null,
      Awaited<ReturnType<typeof listarPublicacionesOcultas>> | null,
      Awaited<ReturnType<typeof listarComentariosOcultos>> | null,
      Awaited<ReturnType<typeof listarReportesDePersonas>> | null,
      Set<string> | null,
      EmergenciaActiva[] | null,
    ];
    const personas = new Set(
      (reportes ?? []).map((r) => r.usuario_id).filter((id) => !(bloqueados ?? new Set()).has(id)),
    );
    setPendientes({
      servicios: (servicios ?? []).filter(filtro).length,
      publicaciones: (publicaciones ?? []).filter(filtro).length,
      comentarios: (comentarios ?? []).filter(filtro).length,
      personas: personas.size,
      emergencias: (emergencias ?? []).filter(filtro),
    });
  }, [zona]);

  useEffect(() => {
    void cargar();
  }, [cargar, pantalla]);

  useEffect(() => {
    const dejar = alCambiarDatos(() => void cargar());
    const reloj = setInterval(() => void cargar(), 60_000);
    return () => {
      dejar();
      clearInterval(reloj);
    };
  }, [cargar]);

  return pendientes;
}
