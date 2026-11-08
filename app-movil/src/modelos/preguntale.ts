/**
 * Modelo. Tipos de la respuesta de la Edge Function `preguntale` (backend/docs/spec_preguntale.md).
 */

export type FuncionPreguntale =
  | "buscar_servicio"
  | "crear_recordatorio"
  | "ver_mi_horario"
  | "pedir_ayuda"
  | "llamar"
  | "como_llegar";

export interface ServicioEncontrado {
  id: string;
  nombre: string;
  oficio: string;
  abiertoAhora: boolean | null;
  vistosBuenosTotal: number;
  contacto: string | null;
  lat: number | null;
  lng: number | null;
}

export interface BotonPreguntale {
  etiqueta: string;
  funcion: FuncionPreguntale | null;
  argumentos: Record<string, unknown>;
}

export interface RespuestaPreguntale {
  texto: string;
  funcion: FuncionPreguntale | null;
  argumentos: Record<string, unknown>;
  confirmar: boolean;
  servicios: ServicioEncontrado[];
  botones: BotonPreguntale[];
}

export interface PreguntaPreguntale {
  texto: string;
  lat?: number;
  lng?: number;
  zonaId?: string;
}
