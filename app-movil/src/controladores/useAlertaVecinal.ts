/**
 * Controlador. G3 · Alerta vecinal real: lo que ve el vecino que recibe el aviso push.
 * 1. Vista previa (ver_alerta): a cuántos metros y cuántos van, sin nombre ni dirección.
 * 2. «Voy a ayudar» (voy_a_ayudar): la base revela nombre, dirección y ubicación solo si se cumplen
 *    sus protecciones; si no, solo devuelve la distancia y no registra nada.
 * 3. «Ya no puedo ir» (ya_no_puedo_ir).
 * Se usa la ubicación actual del teléfono (la base exige estar a 1 km o menos).
 *
 * Para que el mapa salga enseguida: primero la ubicación ya conocida (última del sistema, guardada
 * o la casa) y luego la del GPS. Se vuelve a consultar cada 8 s y al volver a la app (p. ej. desde
 * «Cómo llegar»); el push de cierre la marca terminada al instante (eventosAlerta.ts).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  verAlerta,
  voyAAyudar,
  yaNoPuedoIr,
  type RespuestaVoy,
  type VistaPreviaAlerta,
} from "../modelos/alertaVecinalRepositorio";
import { sincronizarPerfilLocalConNube } from "../modelos/perfilRepositorio";
import { asegurarSesionAnonima } from "../modelos/supabase";
import { codigoDeError, mensajeDeError } from "./errores";
import { alTerminarEmergencia } from "./eventosAlerta";
import { ubicacionConocida, ubicacionGps } from "./ubicacionRapida";

const CADA_MS = 8000;

export type FaseAlerta = "cargando" | "vista" | "voy" | "no_cumple" | "terminada" | "verificar" | "sin_ubicacion" | "error";

/** GPS ahora (máx. 8 s); si no llega, la última conocida. */
async function ubicacionActual(): Promise<{ lat: number; lng: number } | null> {
  const gps = await ubicacionGps(8000, true);
  const u = gps ?? (await ubicacionConocida());
  return u ? { lat: u.lat, lng: u.lng } : null;
}

export function useAlertaVecinal(emergenciaId: string | undefined) {
  const [fase, setFase] = useState<FaseAlerta>("cargando");
  const [vista, setVista] = useState<VistaPreviaAlerta | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaVoy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const coord = useRef<{ lat: number; lng: number } | null>(null);
  const [yo, setYo] = useState<{ lat: number; lng: number } | null>(null);
  const perfilListo = useRef(false);

  // Mapa al instante con la ubicación ya conocida; luego se afina con el GPS.
  useEffect(() => {
    let activo = true;
    void ubicacionConocida().then((u) => {
      if (!activo || !u || coord.current) return;
      coord.current = { lat: u.lat, lng: u.lng };
      setYo(coord.current);
    });
    void ubicacionGps(8000, true).then((u) => {
      if (!activo || !u) return;
      coord.current = { lat: u.lat, lng: u.lng };
      setYo(coord.current);
    });
    return () => {
      activo = false;
    };
  }, []);

  // Push de cierre: «Esta emergencia ya terminó» sin esperar a la siguiente consulta.
  useEffect(
    () =>
      alTerminarEmergencia((id) => {
        if (id === emergenciaId) setFase("terminada");
      }),
    [emergenciaId],
  );

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
      // Una vez por pantalla. Si falla subir el perfil, igual se ve la alerta (la base ya lo tiene).
      if (!perfilListo.current) {
        perfilListo.current = true;
        await sincronizarPerfilLocalConNube().catch(() => undefined);
      }
      coord.current = coord.current ?? (await ubicacionActual());
      if (!coord.current) {
        setFase("sin_ubicacion");
        return;
      }
      setYo(coord.current);
      const v = await verAlerta(emergenciaId, coord.current.lat, coord.current.lng);
      setVista(v);
      setError(null);
      if (!v.activa) setFase("terminada");
      else setFase((f) => (f === "cargando" || f === "error" ? "vista" : f));
    } catch (causa) {
      manejarError(causa);
    }
  }, [emergenciaId, manejarError]);

  useEffect(() => {
    void actualizar();
    const t = setInterval(() => void actualizar(), CADA_MS);
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void actualizar();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
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
