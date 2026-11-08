/**
 * Modelo. Cascada de ayuda de la emergencia (Mockup v4, G2). Reglas puras, sin pantalla.
 *
 * Orden: personas de confianza (máx. 2) → 106 SAMU → 105 Policía → 116 Bomberos.
 * Estados de cada paso: espera → llamando → «no_contesto» o «viene».
 * Cuando alguien viene, los pasos que faltan quedan en «no_hizo_falta».
 *
 * Flujo asistido y honesto (decisión del equipo): la app NO llama ni envía mensajes sola.
 * En el modo real, la persona toca «Llamar» y luego cuenta qué pasó. El modo demo recorre
 * la cascada solo, con letrero de demostración, para mostrar la mejora futura.
 */
export type TipoPaso = "contacto" | "servicio";
export type EstadoPaso = "espera" | "llamando" | "no_contesto" | "viene" | "no_hizo_falta";

export interface PasoCascada {
  id: string;
  titulo: string;
  telefono: string;
  tipo: TipoPaso;
  estado: EstadoPaso;
}

export const SERVICIOS_EMERGENCIA: readonly { titulo: string; telefono: string }[] = [
  { titulo: "106 SAMU", telefono: "106" },
  { titulo: "105 Policía", telefono: "105" },
  { titulo: "116 Bomberos", telefono: "116" },
];

export function armarCascada(contactos: { nombre: string; telefono: string }[]): PasoCascada[] {
  const personas = contactos.slice(0, 2).map<PasoCascada>((c, i) => ({
    id: `contacto-${i}`,
    titulo: c.nombre.trim() || `Persona ${i + 1}`,
    telefono: c.telefono,
    tipo: "contacto",
    estado: "espera",
  }));
  const servicios = SERVICIOS_EMERGENCIA.map<PasoCascada>((s) => ({
    id: `servicio-${s.telefono}`,
    titulo: s.titulo,
    telefono: s.telefono,
    tipo: "servicio",
    estado: "espera",
  }));
  const pasos = [...personas, ...servicios];
  pasos[0] = { ...pasos[0], estado: "llamando" };
  return pasos;
}

/** Índice del paso que se está atendiendo; -1 si la cascada terminó. */
export function pasoActual(pasos: PasoCascada[]): number {
  return pasos.findIndex((p) => p.estado === "llamando");
}

/** La persona del paso actual no contestó: se pasa al siguiente. */
export function noContesto(pasos: PasoCascada[]): PasoCascada[] {
  const i = pasoActual(pasos);
  if (i < 0) return pasos;
  return pasos.map((p, k) => (k === i ? { ...p, estado: "no_contesto" } : k === i + 1 ? { ...p, estado: "llamando" } : p));
}

/** Alguien del paso actual viene en camino: el resto ya no hace falta. */
export function viene(pasos: PasoCascada[]): PasoCascada[] {
  const i = pasoActual(pasos);
  if (i < 0) return pasos;
  return pasos.map((p, k) => (k === i ? { ...p, estado: "viene" } : k > i ? { ...p, estado: "no_hizo_falta" } : p));
}

export function terminada(pasos: PasoCascada[]): boolean {
  return pasoActual(pasos) < 0;
}

export function textoEstado(estado: EstadoPaso): string {
  switch (estado) {
    case "llamando":
      return "Ahora";
    case "no_contesto":
      return "No contestó";
    case "viene":
      return "✓ Viene en camino";
    case "no_hizo_falta":
      return "No hizo falta";
    default:
      return "Si hace falta";
  }
}

/** «Ana y Jorge», «Ana», o «tus personas de confianza». */
export function nombresContactos(contactos: { nombre: string }[]): string {
  const n = contactos.slice(0, 2).map((c) => c.nombre.trim()).filter(Boolean);
  if (n.length === 0) return "tus personas de confianza";
  return n.join(" y ");
}

/** Recorrido del modo demo: Ana y Jorge no contestan, el SAMU viene (como el mockup). */
export const GUION_DEMO: readonly ("no_contesto" | "viene")[] = ["no_contesto", "no_contesto", "viene"];
