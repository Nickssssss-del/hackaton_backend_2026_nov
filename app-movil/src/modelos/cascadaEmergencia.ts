/**
 * Modelo. Cascada de ayuda de la emergencia (Mockup v4, G2). Reglas puras, sin pantalla.
 *
 * Orden: personas de confianza (máx. 2) → comité o autoridad vecinal (si está registrado y
 * verificado) → posta u hospital más cercano con teléfono (radar de 2 km, si se conoce) →
 * 106 SAMU → 105 Policía → 116 Bomberos. Nunca se inventan contactos: si la persona
 * no eligió a nadie, la cascada empieza por el comité vecinal o por el 106.
 * Estados de cada paso: espera → llamando → «no_contesto» o «viene».
 * Cuando alguien viene, los pasos que faltan quedan en «no_hizo_falta».
 *
 * Modo real: la app llama sola a cada paso (controladores/llamadas.ts). Al volver de la llamada
 * pregunta «¿Contestó?»; si nadie responde en unos segundos, pasa al siguiente.
 * Modo demo: no llama a nadie; la cascada avanza sola con letrero de demostración.
 */
export type TipoPaso = "contacto" | "comite" | "salud" | "servicio";
export type EstadoPaso = "espera" | "llamando" | "no_contesto" | "viene" | "no_hizo_falta";

export interface PasoCascada {
  id: string;
  titulo: string;
  /** Nombre completo del servicio (p. ej. SAMU = Servicio de Atención Móvil de Urgencia). */
  detalle?: string;
  telefono: string;
  tipo: TipoPaso;
  estado: EstadoPaso;
}

/** `detalle` = nombre completo, debajo del título (SAMU según el Minsa). */
export const SERVICIOS_EMERGENCIA: readonly { titulo: string; telefono: string; detalle: string }[] = [
  { titulo: "106 SAMU", telefono: "106", detalle: "Servicio de Atención Móvil de Urgencia (Minsa)" },
  { titulo: "105 Policía", telefono: "105", detalle: "Policía Nacional del Perú" },
  { titulo: "116 Bomberos", telefono: "116", detalle: "Cuerpo General de Bomberos Voluntarios del Perú" },
];

export interface ComiteVecinal {
  nombre: string;
  telefono: string;
}

export function armarCascada(
  contactos: { nombre: string; telefono: string }[],
  comite?: ComiteVecinal | null,
  salud?: ComiteVecinal | null,
): PasoCascada[] {
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
    detalle: s.detalle,
    tipo: "servicio",
    estado: "espera",
  }));
  const vecinal: PasoCascada[] = comite?.telefono
    ? [{ id: "comite", titulo: "Comité vecinal", telefono: comite.telefono, tipo: "comite", estado: "espera" }]
    : [];
  const posta: PasoCascada[] = salud?.telefono
    ? [{ id: "salud", titulo: "Posta más cercana", telefono: salud.telefono, tipo: "salud", estado: "espera" }]
    : [];
  const pasos = [...personas, ...vecinal, ...posta, ...servicios];
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

/** A quién se llama primero, en palabras: «Ana y Jorge», «Ana y el comité vecinal», «el comité vecinal»… */
export function aQuienLlamamos(contactos: { nombre: string }[], hayComite: boolean): string {
  const n = contactos.slice(0, 2).map((c) => c.nombre.trim()).filter(Boolean);
  const partes = hayComite ? [...n, "el comité vecinal"] : n;
  if (partes.length === 0) return "la ambulancia (106)";
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/** Demo: todos «no contestan» hasta el 106, que «viene» (como el mockup). */
export function accionDemo(paso: PasoCascada): "no_contesto" | "viene" {
  return paso.telefono === "106" ? "viene" : "no_contesto";
}
