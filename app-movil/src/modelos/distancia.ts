/**
 * Modelo. Distancia sin PostGIS. La app calcula los minutos a pie.
 */

export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const a1 = (lat1 * Math.PI) / 180;
  const a2 = (lat2 * Math.PI) / 180;
  const da = ((lat2 - lat1) * Math.PI) / 180;
  const db = ((lng2 - lng1) * Math.PI) / 180;
  const h =
    Math.sin(da / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(db / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function minutosAPie(metros: number): number {
  return Math.max(1, Math.round(metros / 80));
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
