/**
 * Controlador. «Radar» de ayuda: lugares de salud, bomberos y policía a 1 o 2 km de la persona.
 * Posición en dos tiempos (ubicacionRapida.ts): al instante la ya conocida (sistema, guardada o casa),
 * y luego el GPS (hasta 10 s). Si el GPS la mueve más de 150 m, se vuelven a buscar los lugares.
 * Lugares: OpenStreetMap con copia en el teléfono (lugaresRepositorio.ts).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { dentroDelRadio, RADIO_MAXIMO_M, saludConTelefono, type LugarAyuda } from "../modelos/lugaresAyuda";
import { leerCopiaLugares, obtenerLugares, type OrigenLugares } from "../modelos/lugaresRepositorio";
import { leerPerfilLocal } from "../modelos/local/perfil";
import { leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import { distanciaMetros } from "../modelos/geo";
import { ubicacionConocida, ubicacionGps, type Ubicacion } from "./ubicacionRapida";

type Posicion = Ubicacion;

export function useLugaresCercanos(radio: number) {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [lugares, setLugares] = useState<LugarAyuda[]>([]);
  const [origen, setOrigen] = useState<OrigenLugares>("ninguno");
  const [fecha, setFecha] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinUbicacion, setSinUbicacion] = useState(false);

  const buscar = useCallback(async (p: Posicion, forzar: boolean) => {
    const r = await obtenerLugares(p.lat, p.lng, forzar);
    setLugares(r.copia?.lugares ?? []);
    setFecha(r.copia?.fecha ?? null);
    setOrigen(r.origen);
  }, []);

  const cargar = useCallback(async (forzar = false) => {
    setCargando(true);
    const conocida = await ubicacionConocida();
    if (conocida) {
      setPosicion(conocida);
      setSinUbicacion(false);
      await buscar(conocida, forzar);
    }
    const gps = await ubicacionGps(10000);
    if (gps) {
      setPosicion(gps);
      setSinUbicacion(false);
      if (!conocida || distanciaMetros(conocida.lat, conocida.lng, gps.lat, gps.lng) > 150) await buscar(gps, forzar && !conocida);
    } else if (!conocida) {
      setPosicion(null);
      setSinUbicacion(true);
    }
    setCargando(false);
  }, [buscar]);

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
