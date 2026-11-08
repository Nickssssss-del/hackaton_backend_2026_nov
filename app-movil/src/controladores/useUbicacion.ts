import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { guardarUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import type { UltimaUbicacion } from "../modelos/tipos";

const TIEMPO_MAXIMO_UBICACION = 8000;

export type EstadoPermisoUbicacion = "desconocido" | "concedido" | "denegado";

function conTiempoMaximo<T>(promesa: Promise<T>, maximo: number): Promise<T | null> {
  return Promise.race([
    promesa,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), maximo)),
  ]);
}

export function useUbicacion() {
  const [permiso, setPermiso] = useState<EstadoPermisoUbicacion>("desconocido");
  const [ubicacion, setUbicacion] = useState<UltimaUbicacion | null>(null);
  const [cargando, setCargando] = useState(false);

  const revisarPermiso = useCallback(async () => {
    try {
      const actual = await Location.getForegroundPermissionsAsync();
      setPermiso(actual.granted ? "concedido" : "denegado");
      return actual.granted;
    } catch {
      setPermiso("denegado");
      return false;
    }
  }, []);

  useEffect(() => {
    void revisarPermiso();
  }, [revisarPermiso]);

  const pedirUnaVez = useCallback(async () => {
    setCargando(true);
    try {
      const solicitado = await Location.requestForegroundPermissionsAsync();
      if (!solicitado.granted) {
        setPermiso("denegado");
        return null;
      }
      setPermiso("concedido");
      const posicion = await conTiempoMaximo(Location.getCurrentPositionAsync({}), TIEMPO_MAXIMO_UBICACION);
      if (!posicion) return null;
      const siguiente: UltimaUbicacion = {
        lat: posicion.coords.latitude,
        lng: posicion.coords.longitude,
        fecha: new Date().toISOString(),
      };
      setUbicacion(siguiente);
      await guardarUltimaUbicacion(siguiente);
      return siguiente;
    } catch {
      return null;
    } finally {
      setCargando(false);
    }
  }, []);

  const abrirAjustes = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return { permiso, ubicacion, cargando, revisarPermiso, pedirUnaVez, abrirAjustes };
}
