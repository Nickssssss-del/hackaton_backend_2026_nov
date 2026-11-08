/**
 * Modelo. Lugares de ayuda cerca de la persona («radar» de 1 o 2 km): postas y centros de salud,
 * hospitales y clínicas, bomberos y comisarías. Reglas puras, sin red ni pantalla.
 *
 * Fuente: OpenStreetMap (Overpass API), gratis y sin clave. Ver lugaresRepositorio.ts.
 */
import { distanciaMetros } from "./geo";

export type TipoLugar = "posta" | "hospital" | "bomberos" | "policia";

export interface LugarAyuda {
  id: string;
  nombre: string;
  tipo: TipoLugar;
  lat: number;
  lng: number;
  telefono?: string;
  direccion?: string;
}

export interface LugarCercano extends LugarAyuda {
  /** Metros en línea recta desde la persona. */
  distancia: number;
  /** Grados desde el norte (0–360), para dibujarlo en el radar. */
  angulo: number;
}

export const RADIO_MAXIMO_M = 2000;

export const ETIQUETA_TIPO: Record<TipoLugar, string> = {
  posta: "Posta o centro de salud",
  hospital: "Hospital o clínica",
  bomberos: "Bomberos",
  policia: "Comisaría",
};

/** Consulta Overpass: todo lo de salud, bomberos y policía en un círculo de `radio` metros. */
export function consultaOverpass(lat: number, lng: number, radio = RADIO_MAXIMO_M): string {
  const zona = `(around:${Math.round(radio)},${lat.toFixed(5)},${lng.toFixed(5)})`;
  return `[out:json][timeout:20];(nwr["amenity"~"^(hospital|clinic|doctors|fire_station|police)$"]${zona};nwr["healthcare"~"^(hospital|clinic|centre|doctor)$"]${zona};);out center tags;`;
}

function tipoDe(tags: Record<string, string>): TipoLugar | null {
  const amenity = tags.amenity ?? "";
  const salud = tags.healthcare ?? "";
  if (amenity === "fire_station") return "bomberos";
  if (amenity === "police") return "policia";
  if (amenity === "hospital" || salud === "hospital") return "hospital";
  if (["clinic", "doctors"].includes(amenity) || ["clinic", "centre", "doctor"].includes(salud)) {
    // En Perú, «posta», «puesto de salud» y «centro de salud» son la atención primaria.
    return /cl[ií]nica/i.test(tags.name ?? "") ? "hospital" : "posta";
  }
  return null;
}

function nombrePorDefecto(tipo: TipoLugar): string {
  return { posta: "Centro de salud", hospital: "Hospital", bomberos: "Compañía de bomberos", policia: "Comisaría" }[tipo];
}

/** Convierte la respuesta JSON de Overpass en lugares (sin repetidos). */
export function leerRespuestaOverpass(json: unknown): LugarAyuda[] {
  const elementos = (json as { elements?: unknown[] })?.elements ?? [];
  const vistos = new Set<string>();
  const lugares: LugarAyuda[] = [];
  for (const crudo of elementos) {
    const e = crudo as { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
    const tags = e.tags ?? {};
    const tipo = tipoDe(tags);
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (!tipo || lat === undefined || lng === undefined) continue;
    const nombre = (tags.name ?? "").trim() || nombrePorDefecto(tipo);
    const clave = `${tipo}|${nombre.toLowerCase()}|${lat.toFixed(3)}|${lng.toFixed(3)}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const telefono = (tags.phone ?? tags["contact:phone"] ?? "").split(";")[0].trim() || undefined;
    const direccion = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ") || undefined;
    lugares.push({ id: `${e.type}/${e.id}`, nombre, tipo, lat, lng, telefono, direccion });
  }
  return lugares;
}

function anguloDesde(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Lugares dentro del radio (metros), del más cercano al más lejano. */
export function dentroDelRadio(lugares: LugarAyuda[], lat: number, lng: number, radio: number): LugarCercano[] {
  return lugares
    .map((l) => ({ ...l, distancia: distanciaMetros(lat, lng, l.lat, l.lng), angulo: anguloDesde(lat, lng, l.lat, l.lng) }))
    .filter((l) => l.distancia <= radio)
    .sort((a, b) => a.distancia - b.distancia);
}

export function distanciaLegible(metros: number): string {
  return metros < 1000 ? `${Math.round(metros / 10) * 10} m` : `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}

/** La posta u hospital más cercano CON teléfono (para sumarlo a la cascada de la emergencia). */
export function saludConTelefono(cercanos: LugarCercano[]): LugarCercano | null {
  return cercanos.find((l) => (l.tipo === "posta" || l.tipo === "hospital") && l.telefono) ?? null;
}
