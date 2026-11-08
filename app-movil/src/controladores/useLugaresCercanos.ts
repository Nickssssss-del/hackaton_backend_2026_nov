/**
 * Controlador. «Radar» de ayuda: lugares de salud, bomberos y policía a 1 o 2 km de la persona.
 * Posición: GPS actual (si hay permiso y señal en 8 s); si no, la última guardada o la de su casa.
 * Lugares: OpenStreetMap con copia en el teléfono (lugaresRepositorio.ts).
 */
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dentroDelRadio, RADIO_MAXIMO_M, saludConTelefono, type LugarAyuda } from "../modelos/lugaresAyuda";
import { leerCopiaLugares, obtenerLugares, type OrigenLugares } from "../modelos/lugaresRepositorio";
import { leerPerfilLocal } from "../modelos/local/perfil";
import { guardarUltimaUbicacion, leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";

type Posicion = { lat: number; lng: number; fuente: "gps" | "guardada" | "casa" };

async function posicionActual(): Promise<Posicion | null> {
  try {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (permiso.granted) {
      const p = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((r) => setTimeout(() => r(null), 8000)),
      ]);
      if (p) {
        const { latitude: lat, longitude: lng } = p.coords;
        await guardarUltimaUbicacion({ lat, lng, fecha: new Date().toISOString() });
        return { lat, lng, fuente: "gps" };
      }
    }
  } catch {
    // sigue con lo guardado
  }
  const ultima = await leerUltimaUbicacion();
  if (ultima) return { lat: ultima.lat, lng: ultima.lng, fuente: "guardada" };
  const perfil = await leerPerfilLocal();
  if (perfil?.lat !== undefined && perfil?.lng !== undefined) return { lat: perfil.lat, lng: perfil.lng, fuente: "casa" };
  return null;
}

export function useLugaresCercanos(radio: number) {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [lugares, setLugares] = useState<LugarAyuda[]>([]);
  const [origen, setOrigen] = useState<OrigenLugares>("ninguno");
  const [fecha, setFecha] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinUbicacion, setSinUbicacion] = useState(false);

  const cargar = useCallback(async (forzar = false) => {
    setCargando(true);
    const p = await posicionActual();
    setPosicion(p);
    setSinUbicacion(!p);
    if (p) {
      const r = await obtenerLugares(p.lat, p.lng, forzar);
      setLugares(r.copia?.lugares ?? []);
      setFecha(r.copia?.fecha ?? null);
      setOrigen(r.origen);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cercanos = useMemo(
    () => (posicion ? dentroDelRadio(lugares, posicion.lat, posicion.lng, radio) : []),
    [lugares, posicion, radio],
  );

  return { posicion, cercanos, origen, fecha, cargando, sinUbicacion, actualizar: () => cargar(true) };
}

/** Posta u hospital más cercano con teléfono, según la última copia (no espera a internet). */
export async function postaMasCercana(): Promise<{ nombre: string; telefono: string } | null> {
  const [copia, ultima, perfil] = await Promise.all([leerCopiaLugares(), leerUltimaUbicacion(), leerPerfilLocal()]);
  const lat = ultima?.lat ?? perfil?.lat;
  const lng = ultima?.lng ?? perfil?.lng;
  if (!copia || lat === undefined || lng === undefined) return null;
  const l = saludConTelefono(dentroDelRadio(copia.lugares, lat, lng, RADIO_MAXIMO_M));
  return l?.telefono ? { nombre: l.nombre, telefono: l.telefono } : null;
}
