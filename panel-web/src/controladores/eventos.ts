/**
 * Controlador. Aviso global «cambiaron los datos», para que la barra lateral
 * y el resumen recalculen sus contadores después de una acción del admin.
 */
const EVENTO = "panel:cambio";

export function avisarCambio(): void {
  window.dispatchEvent(new Event(EVENTO));
}

export function alCambiarDatos(aviso: () => void): () => void {
  window.addEventListener(EVENTO, aviso);
  return () => window.removeEventListener(EVENTO, aviso);
}
