/**
 * Controlador. Traduce los códigos de la sección 20.4.
 */

const MENSAJES: Record<string, string> = {
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
const ENLACE = /https?:\/\/|www\./i;

export function mensajeDeError(causa: unknown): string {
  const texto = extraerTexto(causa);
  if (texto.includes("23505")) return MENSAJES.VOTO_REPETIDO;
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
