/**
 * Modelo. Acceso de demostración del panel.
 * No es una cuenta de Supabase ni abre la tabla admins.
 */
export const USUARIO_PRUEBA = "panel.prueba";
export const CLAVE_PRUEBA = "Barrio.2026";

export function credencialesValidas(usuario: string, clave: string): boolean {
  return usuario.trim() === USUARIO_PRUEBA && clave === CLAVE_PRUEBA;
}
