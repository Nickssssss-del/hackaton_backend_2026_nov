/**
 * Modelo. Horario de pastillas (Mockup v4, C1–C3). Solo en el teléfono: no se envía a Supabase.
 * Decisión (INC-21): cada pastilla se repite todos los días a la misma hora.
 * Las tomas se guardan por día; al cambiar el día, todas vuelven a «pendiente».
 */
import { guardarJson, leerJson } from "../almacen";

export interface AvisoPastilla {
  sonido: boolean;
  voz: boolean;
  vibracion: boolean;
}

export interface Pastilla {
  id: string;
  nombre: string;
  /** En pasos de ½: 0.5, 1, 1.5, 2… */
  cantidad: number;
  /** Hora en formato 24 h, "HH:MM". */
  hora: string;
  aviso: AvisoPastilla;
  /** Identificador de la notificación local diaria. */
  notificacionId?: string;
}

/** fecha "YYYY-MM-DD" → ids de pastillas tomadas ese día. */
type Tomas = Record<string, string[]>;

export type EstadoToma = "tomada" | "actual" | "pendiente";

export function leerPastillas(): Promise<Pastilla[]> {
  return leerJson<Pastilla[]>("pastillas", []);
}

export async function guardarPastillas(lista: Pastilla[]): Promise<void> {
  await guardarJson("pastillas", ordenarPorHora(lista));
}

export function ordenarPorHora(lista: Pastilla[]): Pastilla[] {
  return [...lista].sort((a, b) => a.hora.localeCompare(b.hora));
}

export function fechaHoy(ahora = new Date()): string {
  const m = `${ahora.getMonth() + 1}`.padStart(2, "0");
  const d = `${ahora.getDate()}`.padStart(2, "0");
  return `${ahora.getFullYear()}-${m}-${d}`;
}

export async function leerTomadasHoy(): Promise<string[]> {
  const tomas = await leerJson<Tomas>("pastillas_tomas", {});
  return tomas[fechaHoy()] ?? [];
}

export async function marcarTomada(id: string, tomada: boolean): Promise<void> {
  const tomas = await leerJson<Tomas>("pastillas_tomas", {});
  const hoy = fechaHoy();
  const lista = new Set(tomas[hoy] ?? []);
  if (tomada) lista.add(id);
  else lista.delete(id);
  // Solo se guardan los últimos 7 días.
  const fechas = Object.keys(tomas).sort().slice(-6);
  const recortado: Tomas = {};
  for (const f of fechas) recortado[f] = tomas[f];
  recortado[hoy] = [...lista];
  await guardarJson("pastillas_tomas", recortado);
}

/**
 * Estado visible en C1 (Mockup v4): tomada = verde, actual = amarilla (la próxima toma pendiente,
 * o la última pendiente si ya pasaron todas), pendiente = blanca.
 */
export function estadosDelDia(lista: Pastilla[], tomadas: string[], ahora = new Date()): Record<string, EstadoToma> {
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const ordenadas = ordenarPorHora(lista);
  const pendientes = ordenadas.filter((p) => !tomadas.includes(p.id));
  // Actual: la pendiente más cercana que no pasó hace más de 2 horas; si no, la primera pendiente.
  const actual =
    pendientes.find((p) => minutosDe(p.hora) >= minutosAhora - 120) ?? pendientes[pendientes.length - 1];
  const estados: Record<string, EstadoToma> = {};
  for (const p of ordenadas) {
    estados[p.id] = tomadas.includes(p.id) ? "tomada" : p.id === actual?.id ? "actual" : "pendiente";
  }
  return estados;
}

export function minutosDe(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function horaDesdeMinutos(minutos: number): string {
  const total = ((minutos % 1440) + 1440) % 1440;
  return `${`${Math.floor(total / 60)}`.padStart(2, "0")}:${`${total % 60}`.padStart(2, "0")}`;
}

/** "14:00" → { hora: "2:00", periodo: "p. m." } (formato del mockup). */
export function partesHora(hora: string): { hora: string; periodo: "a. m." | "p. m." } {
  const [h, m] = hora.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { hora: `${h12}:${`${m}`.padStart(2, "0")}`, periodo: h < 12 ? "a. m." : "p. m." };
}

export function horaLegible(hora: string): string {
  const p = partesHora(hora);
  return `${p.hora} ${p.periodo}`;
}

/** 0.5 → "½ pastilla", 1 → "1 pastilla", 1.5 → "1 ½ pastillas", 2 → "2 pastillas". */
export function cantidadLegible(cantidad: number): string {
  const enteras = Math.floor(cantidad);
  const media = cantidad - enteras >= 0.5;
  const numero = enteras === 0 ? "½" : media ? `${enteras} ½` : `${enteras}`;
  return `${numero} ${cantidad > 1 ? "pastillas" : "pastilla"}`;
}

export type Franja = "manana" | "tarde" | "noche";

export function franjaDe(hora: string): Franja {
  const h = Number(hora.split(":")[0]);
  if (h >= 5 && h < 12) return "manana";
  if (h >= 12 && h < 19) return "tarde";
  return "noche";
}

export const HORA_POR_FRANJA: Record<Franja, string> = { manana: "08:00", tarde: "14:00", noche: "20:00" };

export function nuevoId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
