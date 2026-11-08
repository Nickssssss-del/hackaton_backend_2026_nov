/**
 * Controlador. Traduce los códigos de error de la base y de las Edge Functions a una frase.
 * Fuente: backend/docs/contrato_modulo2.md, sección 4. La app no reintenta la misma acción.
 */

const MENSAJES: Record<string, string> = {
  CELULAR_NO_VERIFICADO: "Primero confirma tu celular con el código que te llega por SMS.",
  BLOQUEADO: "Tu cuenta no puede hacer esto por ahora.",
  LIMITE_EMERGENCIAS: "Ya pediste ayuda varias veces en la última hora. Llama directo a tus contactos.",
  PUBLICACION_NO_DISPONIBLE: "Esta publicación ya no está disponible.",
  COMENTARIO_NO_DISPONIBLE: "Este comentario ya no está disponible.",
  REPORTE_NO_VALIDO: "Ese reporte no corresponde.",
  EMERGENCIA_TERMINADA: "Esta emergencia ya terminó.",
  MAXIMO_DOS_CONTACTOS: "Solo puedes avisar a dos personas con el enlace.",
  ESLABON_DE_OTRA_EMERGENCIA: "No se pudo guardar ese aviso.",
  FALTA_CONTACTO: "Falta el nombre del contacto.",
  SIN_SESION: "Vuelve a abrir la app e intenta otra vez.",
  TEXTO_INVALIDO: "Dilo de nuevo, más corto.",
  NO_ES_TUYA: "No se pudo avisar a tus vecinos.",
  ERROR_INTERNO: "No se pudo avisar ahora. Intenta otra vez.",
  PERFIL_INCOMPLETO: "Primero completa tus datos.",
  ZONA_DISTINTA: "Solo puedes hacerlo en tu barrio.",
  VOTO_PROPIO: "No puedes dar Visto Bueno a tu propio servicio.",
  VOTO_REPETIDO: "Ya diste tu Visto Bueno a este servicio.",
  LIMITE_DIARIO: "Llegaste al límite de hoy. Inténtalo mañana.",
  CON_ENLACE: "Quita la página web del texto.",
  MOTIVO_INVALIDO: "Elige uno de los botones.",
  PEDIDO_NO_DISPONIBLE: "Este pedido ya no está disponible.",
  SERVICIO_NO_DISPONIBLE: "Este servicio ya no está disponible.",
  SIN_INTERNET: "Necesitas internet para enviar.",
};

const CODIGOS = Object.keys(MENSAJES);

/** Código de la base o de una Edge Function que trae el error, si es uno conocido. */
export function codigoDeError(causa: unknown): string | null {
  const texto = extraerTexto(causa);
  return CODIGOS.find((item) => texto.includes(item)) ?? null;
}
const ENLACE = /https?:\/\/|www\./i;

export function mensajeDeError(causa: unknown, contexto: "voto" | "reporte" | "general"): string {
  const texto = extraerTexto(causa);
  if (texto.includes("23505")) {
    if (contexto === "voto") return MENSAJES.VOTO_REPETIDO;
    if (contexto === "reporte") return "Ya reportaste este servicio.";
  }
  const codigo = CODIGOS.find((item) => texto.includes(item));
  if (codigo) return MENSAJES[codigo];
  console.error(causa);
  return "Algo salió mal. Inténtalo otra vez.";
}

/** Devuelve un mensaje si el texto no se puede publicar. Null si es válido. */
export function revisarTexto(texto: string, obligatorio: boolean): string | null {
  const limpio = texto.trim();
  if (!limpio && obligatorio) return "Escribe un texto breve.";
  if (limpio.length > 140) return "Usa como máximo 140 caracteres.";
  if (ENLACE.test(limpio)) return MENSAJES.CON_ENLACE;
  return null;
}

function extraerTexto(causa: unknown): string {
  if (typeof causa === "string") return causa;
  if (causa instanceof Error) return causa.message;
  if (typeof causa !== "object" || causa === null) return "";

  const registro = causa as Record<string, unknown>;
  return [registro.code, registro.message, registro.details, registro.hint]
    .filter((parte) => typeof parte === "string")
    .join(" ");
}
