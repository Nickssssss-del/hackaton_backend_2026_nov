/**
 * Controlador. Grupos de apoyo con minutos a pie.
 * Si no hay red, la emergencia sigue con la ficha local.
 */
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { distanciaMetros, minutosAPie } from "../modelos/distancia";
import { listarGrupos, type GrupoApoyo } from "../modelos/gruposRepositorio";

export interface GrupoCercano extends GrupoApoyo {
  minutos?: number;
}

export function useGruposCercanos() {
  const [grupos, setGrupos] = useState<GrupoCercano[]>([]);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const lista = await listarGrupos();
        const permiso = await Location.getForegroundPermissionsAsync();
        let aqui: { lat: number; lng: number } | null = null;
        if (permiso.granted) {
          const punto = await Location.getCurrentPositionAsync({});
          aqui = { lat: punto.coords.latitude, lng: punto.coords.longitude };
        }
        if (!activo) return;
        setGrupos(
          lista.map((grupo) => ({
            ...grupo,
            minutos:
              aqui && grupo.lat !== null && grupo.lng !== null
                ? minutosAPie(distanciaMetros(aqui.lat, aqui.lng, grupo.lat, grupo.lng))
                : undefined,
          })),
        );
      } catch {
        if (activo) setGrupos([]);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  return grupos;
}
