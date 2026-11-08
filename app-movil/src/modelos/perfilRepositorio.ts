/**
 * Modelo. El vecino solo lee y edita su fila de perfiles, y lee zonas.
 */
import type { PerfilLocal, ZonaPublica } from "./tipos";
import { borrarMisDatos, obtenerSupabase } from "./supabase";
import { asignarZona, redondear3 } from "./geo";
import { listarZonasPublicas } from "./zonasRepositorio";
import { leerPreferenciasCompletas } from "./local/preferencias";

export async function listarZonas(): Promise<ZonaPublica[]> {
  const { data, error } = await obtenerSupabase()
    .from("zonas")
    .select("id, nombre, distrito")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as ZonaPublica[];
}

export async function guardarPerfilNube(perfil: PerfilLocal): Promise<void> {
  const { data, error: sesionError } = await obtenerSupabase().auth.getUser();
  if (sesionError) throw sesionError;
  const id = data.user?.id;
  if (!id) throw new Error("SIN_SESION");

  const nombre = perfil.nombre?.trim() ?? "";
  const celular = perfil.celular?.trim() ?? "";
  const zonas = await listarZonasPublicas();
  const zonasConGeometria = zonas.filter(
    (zona): zona is ZonaPublica & { latCentro: number; lngCentro: number; radioM: number } =>
      typeof zona.latCentro === "number" &&
      typeof zona.lngCentro === "number" &&
      typeof zona.radioM === "number",
  );
  const zonaCalculada =
    typeof perfil.lat === "number" && typeof perfil.lng === "number"
      ? asignarZona(perfil.lat, perfil.lng, zonasConGeometria)
      : null;
  const coordenadasValidas = zonaCalculada === perfil.zonaId;
  // «Vecinos cerca me ven si pido ayuda» (B3) viaja con el perfil: perfiles.alerta_vecinal (script 07).
  const { visibleParaVecinos } = await leerPreferenciasCompletas();
  const fila = {
    id,
    nombre: nombre.length >= 2 ? nombre : null,
    celular: /^9\d{8}$/.test(celular) ? celular : null,
    zona_id: perfil.zonaId || null,
    lat: coordenadasValidas && perfil.lat !== undefined ? redondear3(perfil.lat) : null,
    lng: coordenadasValidas && perfil.lng !== undefined ? redondear3(perfil.lng) : null,
  };
  const { error } = await obtenerSupabase().from("perfiles").upsert({ ...fila, alerta_vecinal: visibleParaVecinos });
  if (error && /alerta_vecinal/.test(error.message ?? "")) {
    // Base sin el script 07 todavía: se guarda el perfil sin el interruptor.
    const reintento = await obtenerSupabase().from("perfiles").upsert(fila);
    if (reintento.error) throw reintento.error;
    return;
  }
  if (error) throw error;
}

/**
 * Registro v4 (A3): sube SOLO la zona y las coordenadas redondeadas a 3 decimales
 * (matriz técnica: «A la nube: 3 decimales»). Nombre, edad, género, dirección y
 * contactos se quedan en el teléfono. Si no hay zona, no se envían coordenadas:
 * el trigger validar_zona_perfil rechazaría coordenadas fuera de la zona.
 */
export async function guardarUbicacionNube(lat: number, lng: number): Promise<string | null> {
  const { data, error: sesionError } = await obtenerSupabase().auth.getUser();
  if (sesionError) throw sesionError;
  const id = data.user?.id;
  if (!id) throw new Error("SIN_SESION");

  const zonas = await listarZonasPublicas();
  const conGeometria = zonas.filter(
    (zona): zona is ZonaPublica & { latCentro: number; lngCentro: number; radioM: number } =>
      typeof zona.latCentro === "number" && typeof zona.lngCentro === "number" && typeof zona.radioM === "number",
  );
  const zonaId = asignarZona(lat, lng, conGeometria);
  if (!zonaId) return null;

  const { error } = await obtenerSupabase()
    .from("perfiles")
    .upsert({ id, zona_id: zonaId, lat: redondear3(lat), lng: redondear3(lng) });
  if (error) throw error;
  return zonaId;
}

export async function perfilEstaCompleto(): Promise<boolean> {
  const { data, error } = await obtenerSupabase().auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) return false;
  const perfil = await obtenerSupabase()
    .from("perfiles")
    .select("nombre, celular, zona_id")
    .eq("id", id)
    .maybeSingle();
  if (perfil.error) throw perfil.error;
  return Boolean(perfil.data?.nombre && perfil.data?.celular && perfil.data?.zona_id);
}

export { borrarMisDatos };
