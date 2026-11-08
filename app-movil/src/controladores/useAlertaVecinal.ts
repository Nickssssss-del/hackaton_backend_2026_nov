/**
 * Controlador. G3 · Alerta vecinal real: lo que ve el vecino que recibe el aviso push.
 * 1. Vista previa (ver_alerta): a cuántos metros y cuántos van, sin nombre ni dirección.
 * 2. «Voy a ayudar» (voy_a_ayudar): la base revela nombre, dirección y ubicación solo si se cumplen
 *    sus protecciones; si no, solo devuelve la distancia y no registra nada.
 * 3. «Ya no puedo ir» (ya_no_puedo_ir).
 * Se usa la ubicación actual del teléfono (la base exige estar a 1 km o menos).
 */
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  verAlerta,
  voyAAyudar,
  yaNoPuedoIr,
  type RespuestaVoy,
  type VistaPreviaAlerta,
} from "../modelos/alertaVecinalRepositorio";
import { leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import { asegurarSesionAnonima } from "../modelos/supabase";
import { codigoDeError, mensajeDeError } from "./errores";

export type FaseAlerta = "cargando" | "vista" | "voy" | "no_cumple" | "terminada" | "verificar" | "sin_ubicacion" | "error";

async function ubicacionActual(): Promise<{ lat: number; lng: number } | null> {
  try {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (permiso.granted) {
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({}),
        new Promise<null>((r) => setTimeout(() => r(null), 8000)),
      ]);
      if (pos) return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
  } catch {
    // se usa la última guardada
  }
  const ultima = await leerUltimaUbicacion();
  return ultima ? { lat: ultima.lat, lng: ultima.lng } : null;
}

export function useAlertaVecinal(emergenciaId: string | undefined) {
  const [fase, setFase] = useState<FaseAlerta>("cargando");
  const [vista, setVista] = useState<VistaPreviaAlerta | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaVoy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const coord = useRef<{ lat: number; lng: number } | null>(null);
  const [yo, setYo] = useState<{ lat: number; lng: number } | null>(null);

  const manejarError = useCallback((causa: unknown) => {
    const codigo = codigoDeError(causa);
    if (codigo === "EMERGENCIA_TERMINADA") setFase("terminada");
    else if (codigo === "CELULAR_NO_VERIFICADO") setFase("verificar");
    else {
      setError(mensajeDeError(causa, "general"));
      setFase((f) => (f === "cargando" ? "error" : f));
    }
  }, []);

  const actualizar = useCallback(async () => {
    if (!emergenciaId) {
      setFase("terminada");
      return;
    }
    try {
      await asegurarSesionAnonima();
      coord.current = coord.current ?? (await ubicacionActual());
      if (!coord.current) {
        setFase("sin_ubicacion");
        return;
      }
      setYo(coord.current);
      const v = await verAlerta(emergenciaId, coord.current.lat, coord.current.lng);
      setVista(v);
      if (!v.activa) setFase("terminada");
      else setFase((f) => (f === "cargando" || f === "error" ? "vista" : f));
    } catch (causa) {
      manejarError(causa);
    }
  }, [emergenciaId, manejarError]);

  useEffect(() => {
    void actualizar();
    const t = setInterval(() => void actualizar(), 15000);
    return () => clearInterval(t);
  }, [actualizar]);

  const voy = useCallback(async () => {
    if (!emergenciaId) return;
    setError(null);
    setOcupado(true);
    try {
      coord.current = (await ubicacionActual()) ?? coord.current;
      if (!coord.current) {
        setFase("sin_ubicacion");
        return;
      }
      setYo(coord.current);
      const r = await voyAAyudar(emergenciaId, coord.current.lat, coord.current.lng);
      setRespuesta(r);
      setVista((v) => (v ? { ...v, vecinosEnCamino: r.vecinosEnCamino } : v));
      setFase(r.datosRevelados ? "voy" : "no_cumple");
    } catch (causa) {
      manejarError(causa);
    } finally {
      setOcupado(false);
    }
  }, [emergenciaId, manejarError]);

  const noPuedo = useCallback(async () => {
    if (!emergenciaId) return;
    setOcupado(true);
    try {
      await yaNoPuedoIr(emergenciaId);
    } catch {
      // Si falla, la base deja de contarlo al cerrar o vencer la emergencia.
    } finally {
      setOcupado(false);
    }
  }, [emergenciaId]);

  return { fase, vista, respuesta, error, ocupado, voy, noPuedo, reintentar: actualizar, yo };
}
