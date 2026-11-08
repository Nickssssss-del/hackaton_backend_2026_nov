/**
 * Modelo. Lado del vecino que recibe una alerta (G3) y registro del token de push.
 * Contrato del Módulo 2, sección 3:
 * - ver_alerta: vista previa (distancia y cuántos van), sin nombre ni dirección.
 * - voy_a_ayudar: revela nombre, dirección y ubicación solo si se cumplen las protecciones
 *   (celular verificado, alerta activa, domicilio a 500 m o menos, ubicación actual a 1 km o menos).
 * - ya_no_puedo_ir: resta al contador y deja de mostrar la dirección.
 * - registrar_push_token: la app no escribe directo en push_tokens.
 */
import { obtenerSupabase } from "./supabase";

export interface VistaPreviaAlerta {
  activa: boolean;
  distanciaM: number;
  vecinosEnCamino: number;
}

export interface RespuestaVoy {
  datosRevelados: boolean;
  nombre?: string;
  direccion?: string;
  lat?: number;
  lng?: number;
  distanciaM: number;
  vecinosEnCamino: number;
}

function fila(data: unknown): Record<string, unknown> {
  const f = Array.isArray(data) ? data[0] : data;
  return (f ?? {}) as Record<string, unknown>;
}

function numero(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function verAlerta(emergenciaId: string, lat: number, lng: number): Promise<VistaPreviaAlerta> {
  const { data, error } = await obtenerSupabase().rpc("ver_alerta", { p_emergencia: emergenciaId, p_lat: lat, p_lng: lng });
  if (error) throw error;
  const f = fila(data);
  return {
    activa: f.activa === true,
    distanciaM: numero(f.distancia_m) ?? 0,
    vecinosEnCamino: numero(f.vecinos_en_camino) ?? 0,
  };
}

export async function voyAAyudar(emergenciaId: string, lat: number, lng: number): Promise<RespuestaVoy> {
  const { data, error } = await obtenerSupabase().rpc("voy_a_ayudar", { p_emergencia: emergenciaId, p_lat: lat, p_lng: lng });
  if (error) throw error;
  const f = fila(data);
  return {
    datosRevelados: f.datos_revelados === true,
    nombre: typeof f.nombre === "string" ? f.nombre : undefined,
    direccion: typeof f.direccion === "string" ? f.direccion : undefined,
    lat: numero(f.lat),
    lng: numero(f.lng),
    distanciaM: numero(f.distancia_m) ?? 0,
    vecinosEnCamino: numero(f.vecinos_en_camino) ?? 0,
  };
}

export async function yaNoPuedoIr(emergenciaId: string): Promise<void> {
  const { error } = await obtenerSupabase().rpc("ya_no_puedo_ir", { p_emergencia: emergenciaId });
  if (error) throw error;
}

export async function registrarPushToken(token: string, plataforma: "android" | "ios"): Promise<void> {
  const { error } = await obtenerSupabase().rpc("registrar_push_token", { p_token: token, p_plataforma: plataforma });
  if (error) throw error;
}
