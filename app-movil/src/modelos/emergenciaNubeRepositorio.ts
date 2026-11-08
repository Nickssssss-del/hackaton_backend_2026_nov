/**
 * Modelo. La emergencia en la base (script 07, contrato del Módulo 2, secciones 1, 5, 7 y 8).
 *
 * Todo es un complemento de la emergencia local: las llamadas y el SMS salen del teléfono aunque
 * nada de esto funcione (sin internet, sin perfil o con LIMITE_EMERGENCIAS).
 * - emergencias: datos temporales (nombre, dirección, ubicación exacta), se borran al cerrar o a las 2 h.
 * - eslabones: estado de cada llamada de la cadena (orden 1 a 5). El número no se guarda.
 * - enlaces: token de la página «Voy en camino» para el SMS (máximo 2 por emergencia).
 * - alerta-vecinos: Edge Function que avisa por push a vecinos con alerta activa (inicio y cierre).
 * - vecinos_que_van y enlaces se escuchan por Realtime para el contador de quién va.
 */
import type { RealtimeChannel } from "@supabase/supabase-js";
import { obtenerSupabase } from "./supabase";

export type EstadoEslabon = "pendiente" | "llamando" | "no_contesto" | "hablamos" | "va_en_camino";

export interface DatosEmergenciaNube {
  nombre?: string;
  direccion?: string;
  lat?: number;
  lng?: number;
  practica?: boolean;
}

export interface EmergenciaCreada {
  id: string;
  avisarVecinos: boolean;
}

/** Página pública «Voy en camino» (backend/web/voy-en-camino). Se puede cambiar por .env. */
export const URL_VOY_EN_CAMINO = process.env.EXPO_PUBLIC_VOY_EN_CAMINO_URL || "https://kuna-voy.netlify.app";

export function urlVoyEnCamino(token: string): string {
  return `${URL_VOY_EN_CAMINO.replace(/\/$/, "")}/?t=${token}`;
}

export async function crearEmergencia(d: DatosEmergenciaNube): Promise<EmergenciaCreada> {
  const tieneCoordenadas = typeof d.lat === "number" && typeof d.lng === "number";
  const { data, error } = await obtenerSupabase()
    .from("emergencias")
    .insert({
      practica: d.practica === true,
      nombre: d.nombre?.trim().slice(0, 60) || null,
      direccion: d.direccion?.trim().slice(0, 120) || null,
      lat: tieneCoordenadas ? Number(d.lat!.toFixed(6)) : null,
      lng: tieneCoordenadas ? Number(d.lng!.toFixed(6)) : null,
    })
    .select("id, avisar_vecinos")
    .single();
  if (error) throw error;
  return { id: String(data.id), avisarVecinos: Boolean(data.avisar_vecinos) };
}

/** Crea los eslabones de la cadena (máximo 5, en orden). Devuelve orden → id. */
export async function crearEslabones(emergenciaId: string, contactos: string[]): Promise<Record<number, string>> {
  const filas = contactos.slice(0, 5).map((contacto, k) => ({
    emergencia_id: emergenciaId,
    orden: k + 1,
    contacto: contacto.trim().slice(0, 40) || `Paso ${k + 1}`,
    estado: "pendiente" as EstadoEslabon,
  }));
  if (filas.length === 0) return {};
  const { data, error } = await obtenerSupabase().from("eslabones").insert(filas).select("id, orden");
  if (error) throw error;
  const mapa: Record<number, string> = {};
  for (const f of data ?? []) mapa[Number(f.orden)] = String(f.id);
  return mapa;
}

export async function actualizarEslabon(eslabonId: string, estado: EstadoEslabon): Promise<void> {
  const { error } = await obtenerSupabase().from("eslabones").update({ estado }).eq("id", eslabonId);
  if (error) throw error;
}

/** Crea el enlace «Voy en camino» y devuelve su token (lo genera la base). */
export async function crearEnlace(emergenciaId: string, contacto: string, eslabonId?: string): Promise<string> {
  const { data, error } = await obtenerSupabase()
    .from("enlaces")
    .insert({ emergencia_id: emergenciaId, contacto: contacto.trim().slice(0, 40) || "Contacto", eslabon_id: eslabonId ?? null })
    .select("token")
    .single();
  if (error) throw error;
  return String(data.token);
}

/** Llama a la Edge Function alerta-vecinos. Devuelve cuántos avisos aceptó Expo. */
export async function avisarVecinos(emergenciaId: string, tipo: "inicio" | "cierre"): Promise<number> {
  const { data, error } = await obtenerSupabase().functions.invoke("alerta-vecinos", {
    body: { emergencia_id: emergenciaId, tipo },
  });
  if (error) throw error;
  return Number((data as { avisados?: unknown } | null)?.avisados) || 0;
}

export async function cerrarEmergencia(emergenciaId: string): Promise<boolean> {
  const { data, error } = await obtenerSupabase().rpc("cerrar_emergencia", { p_emergencia: emergenciaId });
  if (error) throw error;
  return data === true;
}

export interface EstadoAyudaEnCamino {
  vecinosEnCamino: number;
  contactosEnCamino: string[];
}

export async function leerAyudaEnCamino(emergenciaId: string): Promise<EstadoAyudaEnCamino> {
  const supabase = obtenerSupabase();
  const [vecinos, enlaces] = await Promise.all([
    supabase.from("vecinos_que_van").select("id", { count: "exact", head: true }).eq("emergencia_id", emergenciaId).eq("estado", "va"),
    supabase.from("enlaces").select("contacto, va_en_camino_en").eq("emergencia_id", emergenciaId),
  ]);
  return {
    vecinosEnCamino: vecinos.count ?? 0,
    contactosEnCamino: (enlaces.data ?? [])
      .filter((e: { va_en_camino_en: string | null }) => e.va_en_camino_en)
      .map((e: { contacto: string | null }) => e.contacto ?? "Tu contacto"),
  };
}

/** Escucha por Realtime a los vecinos que van y los enlaces marcados. Devuelve cómo dejar de escuchar. */
export function escucharAyudaEnCamino(emergenciaId: string, alCambiar: () => void): () => void {
  const supabase = obtenerSupabase();
  const canal: RealtimeChannel = supabase
    .channel(`emergencia-${emergenciaId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "vecinos_que_van", filter: `emergencia_id=eq.${emergenciaId}` }, alCambiar)
    .on("postgres_changes", { event: "*", schema: "public", table: "enlaces", filter: `emergencia_id=eq.${emergenciaId}` }, alCambiar)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "eslabones", filter: `emergencia_id=eq.${emergenciaId}` }, alCambiar)
    .subscribe();
  return () => {
    void supabase.removeChannel(canal);
  };
}
