/**
 * Controlador. «Resumen del día»: totales filtrados por zona.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { leerResumen, type DatosResumen } from "../modelos/resumen";
import { mensajeDeError } from "./errores";
import { alCambiarDatos } from "./eventos";
import { enZona } from "./usePendientes";

export function useResumen(zona: string) {
  const [datos, setDatos] = useState<DatosResumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await leerResumen());
    } catch (causa) {
      setError(mensajeDeError(causa, "No se pudo leer el resumen del día."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
    return alCambiarDatos(() => void cargar());
  }, [cargar]);

  const resumen = useMemo(() => {
    if (!datos) return null;
    const filtro = enZona(zona);
    const emergencias = datos.emergenciasHoy.filter(filtro);
    const avisos = datos.avisos.filter(filtro);

    let uso: { aperturas: number[]; segundosHoy: number } | null = null;
    if (datos.uso) {
      const zonasUso = Object.entries(datos.uso).filter(([z]) => !zona || z === zona);
      uso = {
        aperturas: Array.from({ length: 7 }, (_, i) => zonasUso.reduce((suma, [, u]) => suma + (u.aperturas[i] ?? 0), 0)),
        segundosHoy: zonasUso.reduce((suma, [, u]) => suma + u.segundosHoy, 0),
      };
    }

    return {
      negocios: datos.negocios.filter(filtro).length,
      pedidos: datos.pedidos.filter(filtro).length,
      emergenciasReales: emergencias.filter((e) => !e.practica).length,
      emergenciasPractica: emergencias.filter((e) => e.practica).length,
      avisosInicio: avisos.filter((a) => a.tipo === "inicio").length,
      avisosCierre: avisos.filter((a) => a.tipo === "cierre").length,
      uso,
    };
  }, [datos, zona]);

  const recargar = () => {
    setCargando(true);
    void cargar();
  };

  return { resumen, cargando, error, recargar };
}
