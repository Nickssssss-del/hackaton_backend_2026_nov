import type { ZonaPublica } from "./tipos";

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const a1 = (lat1 * Math.PI) / 180;
  const a2 = (lat2 * Math.PI) / 180;
  const da = ((lat2 - lat1) * Math.PI) / 180;
  const db = ((lng2 - lng1) * Math.PI) / 180;
  const h =
    Math.sin(da / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(db / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const distanciaMetros = haversine;

export function minutosAPie(metros: number, cuestaCaminar = false): number {
  return Math.max(1, Math.ceil(metros / (cuestaCaminar ? 40 : 60)));
}

export function redondear3(valor: number): number {
  return Number(valor.toFixed(3));
}

export function asignarZona(
  lat: number,
  lng: number,
  zonas: Array<ZonaPublica & { latCentro: number; lngCentro: number; radioM: number }>,
): string | null {
  const zona = zonas
    .map((item) => ({ item, distancia: haversine(lat, lng, item.latCentro, item.lngCentro) }))
    .filter(({ item, distancia }) => distancia <= item.radioM)
    .sort((a, b) => a.distancia - b.distancia)[0];
  return zona?.item.id ?? null;
}

export function rumbo(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const y = Math.sin(((lng2 - lng1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lng2 - lng1) * Math.PI) / 180);
  const grados = (Math.atan2(y, x) * 180) / Math.PI;
  const puntos = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return puntos[Math.round(((grados + 360) % 360) / 45) % 8];
}

export interface PuntoSeguro {
  nombre: string;
  lat: number;
  lng: number;
}

export function puntoSeguroMasCercano(
  lat: number,
  lng: number,
  puntos: PuntoSeguro[],
): PuntoSeguro | null {
  return puntos.reduce<PuntoSeguro | null>((cercano, punto) => {
    if (!cercano) return punto;
    return haversine(lat, lng, punto.lat, punto.lng) <
      haversine(lat, lng, cercano.lat, cercano.lng)
      ? punto
      : cercano;
  }, null);
}
