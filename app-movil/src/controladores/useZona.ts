import { useCallback, useEffect, useState } from "react";
import { asignarZona } from "../modelos/geo";
import { leerJson, guardarJson } from "../modelos/almacen";
import { listarZonasPublicas } from "../modelos/zonasRepositorio";
import type { ZonaPublica } from "../modelos/tipos";

const CLAVE_ZONAS = "zonas";

export function useZona() {
  const [zonas, setZonas] = useState<ZonaPublica[]>([]);
  const [zonaId, setZonaId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      const copia = await leerJson<ZonaPublica[]>(CLAVE_ZONAS, []);
      if (activo) setZonas(copia);
      try {
        const remotas = await listarZonasPublicas();
        await guardarJson(CLAVE_ZONAS, remotas);
        if (activo) setZonas(remotas);
      } catch {
        // La copia local es el último recurso cuando no hay red o configuración.
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const asignarDesdeUbicacion = useCallback(
    (lat: number, lng: number) => {
      const candidatas = zonas.filter(
        (zona): zona is ZonaPublica & { latCentro: number; lngCentro: number; radioM: number } =>
          typeof zona.latCentro === "number" &&
          typeof zona.lngCentro === "number" &&
          typeof zona.radioM === "number",
      );
      const asignada = asignarZona(lat, lng, candidatas);
      setZonaId(asignada);
      return asignada;
    },
    [zonas],
  );

  const elegirZona = useCallback((id: string) => {
    setZonaId(id);
    return id;
  }, []);

  return { zonas, zonaId, cargando, asignarDesdeUbicacion, elegirZona };
}
