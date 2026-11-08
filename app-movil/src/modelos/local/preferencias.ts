/**
 * Modelo. Preferencias del teléfono (AsyncStorage, clave barrio.preferencias).
 * Solo en el dispositivo: nunca se envían a Supabase.
 */
import { guardarJson, leerJson } from "../almacen";

export type TamanoLetra = "normal" | "grande" | "enorme";
export type ModoUso = "sencillo" | "completo";

export interface Preferencias {
  /** Tamaño de letra del Mockup v4: Normal 20 px, Grande 23 px, Enorme 26 px. */
  tamano?: TamanoLetra;
  oscuro?: boolean;
  /** Se elige en A2 y se cambia en Mis datos. */
  modo?: ModoUso;
  sonidos?: boolean;
  /** A5 / B3: avisar a los contactos al salir de casa. Por defecto No (requiere consentimiento). */
  avisarAlSalir?: boolean;
  /** Campos de la versión anterior. Se leen solo para migrar. */
  tema?: "claro" | "emergencia" | "oscuro";
  escalaLetra?: number;
}

export interface PreferenciasCompletas {
  tamano: TamanoLetra;
  oscuro: boolean;
  modo: ModoUso | null;
  sonidos: boolean;
  avisarAlSalir: boolean;
}

function tamanoDesdeEscala(escala?: number): TamanoLetra {
  if (escala === undefined || escala <= 1) return "normal";
  return escala < 1.3 ? "grande" : "enorme";
}

export async function leerPreferencias(): Promise<Preferencias> {
  return leerJson<Preferencias>("preferencias", {});
}

/** Lee y completa con valores por defecto, migrando los campos antiguos. */
export async function leerPreferenciasCompletas(): Promise<PreferenciasCompletas> {
  const p = await leerPreferencias();
  return {
    tamano: p.tamano ?? tamanoDesdeEscala(p.escalaLetra),
    oscuro: p.oscuro ?? p.tema === "oscuro",
    modo: p.modo ?? null,
    sonidos: p.sonidos ?? true,
    avisarAlSalir: p.avisarAlSalir ?? false,
  };
}

/** Guarda solo los campos recibidos y conserva el resto. */
export async function guardarPreferencias(cambios: Preferencias): Promise<void> {
  const actuales = await leerPreferencias();
  const nuevas: Preferencias = { ...actuales, ...cambios };
  if (cambios.tema !== undefined && cambios.oscuro === undefined) {
    nuevas.oscuro = cambios.tema === "oscuro";
  }
  if (cambios.escalaLetra !== undefined && cambios.tamano === undefined) {
    nuevas.tamano = tamanoDesdeEscala(cambios.escalaLetra);
  }
  await guardarJson("preferencias", nuevas);
}
