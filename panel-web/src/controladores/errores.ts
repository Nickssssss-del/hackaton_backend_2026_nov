/**
 * Controlador. Traduce errores del modelo a frases para el admin.
 */
function texto(causa: unknown): string {
  if (causa instanceof Error) return causa.message;
  if (typeof causa === "object" && causa !== null) {
    const registro = causa as Record<string, unknown>;
    return [registro.code, registro.message].filter((parte) => typeof parte === "string").join(" ");
  }
  return String(causa);
}

export function mensajeDeError(causa: unknown, porDefecto: string): string {
  const detalle = texto(causa);
  if (detalle.includes("FALTA_CONFIGURACION")) {
    return "Falta configurar Supabase en panel-web/.env (mira .env.example).";
  }
  if (detalle.includes("YA_BLOQUEADO")) {
    return "Ese usuario ya está bloqueado.";
  }
  if (detalle.includes("SIN_PERMISO")) {
    return "No se hizo el cambio: tu cuenta no tiene permiso o el registro ya no existe. Recarga la lista.";
  }
  if (/failed to fetch|network/i.test(detalle)) {
    return "No hay conexión con Supabase. Revisa tu internet e inténtalo otra vez.";
  }
  console.error(causa);
  return porDefecto;
}
