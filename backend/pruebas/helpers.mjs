/**
 * helpers.mjs
 * Sesiones anónimas y lecturas del entorno para las pruebas de RLS.
 * Usa solo la anon key.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const aqui = dirname(fileURLToPath(import.meta.url));

export function cargarEntorno() {
  const ruta = [resolve(aqui, "../.env"), resolve(aqui, "../../.env")].find((item) =>
    existsSync(item),
  );
  if (!ruta) return;
  for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#") || !limpia.includes("=")) continue;
    const corte = limpia.indexOf("=");
    const clave = limpia.slice(0, corte).trim();
    const valor = limpia.slice(corte + 1).trim();
    if (!process.env[clave]) process.env[clave] = valor;
  }
}

cargarEntorno();

export const url = process.env.SUPABASE_URL;
export const anonKey = process.env.SUPABASE_ANON_KEY;
export const ZONA_CERCADO = "11111111-0000-4000-8000-000000000001";
export const ZONA_PARCONA = "11111111-0000-4000-8000-000000000003";

export function clienteNuevo() {
  if (!url || !anonKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY.");
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function crearVecino({ nombre, celular, zonaId, lat, lng }) {
  const sb = clienteNuevo();
  const ingreso = await sb.auth.signInAnonymously();
  if (ingreso.error) throw ingreso.error;
  const id = ingreso.data.user.id;
  const perfil = await sb.from("perfiles").insert({
    id,
    nombre: nombre ?? null,
    celular: celular ?? null,
    zona_id: zonaId ?? null,
    lat: lat ?? null,
    lng: lng ?? null,
  });
  if (perfil.error) throw perfil.error;
  return { sb, id, sesion: ingreso.data.session };
}

export async function publicarServicio(sb, extra = {}) {
  const creado = await sb
    .from("servicios")
    .insert({
      nombre_negocio: extra.nombreNegocio ?? "Café Ficticio",
      oficio: extra.oficio ?? "cafeteria",
      descripcion: extra.descripcion ?? "Café de la esquina, sin delivery.",
      precio_desde: extra.precioDesde ?? 5,
      hora_apertura: extra.horaApertura ?? "07:00",
      hora_cierre: extra.horaCierre ?? "21:00",
      direccion: extra.direccion ?? "Calle Lima 245",
      mostrar_direccion: extra.mostrarDireccion ?? false,
      contacto: extra.contacto ?? "956000111",
      mostrar_telefono: extra.mostrarTelefono ?? false,
      lat: extra.lat ?? -14.068,
      lng: extra.lng ?? -75.728,
      zona_id: extra.zonaId ?? ZONA_CERCADO,
      disponible_emergencia: false,
    })
    .select("id, lat")
    .single();
  return creado;
}

export async function publicarPedido(sb, extra = {}) {
  return sb
    .from("pedidos_ayuda")
    .insert({
      categoria: extra.categoria ?? "arreglos",
      descripcion: extra.descripcion ?? "Se soltó una puerta.",
      zona_id: extra.zonaId ?? ZONA_CERCADO,
    })
    .select("id")
    .single();
}

export function mensaje(error) {
  if (!error) return "";
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" ");
}
