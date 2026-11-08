/**
 * Controlador. Aviso interno «esta emergencia terminó»: lo emite AvisosDeVecinos al recibir el push
 * de cierre («Ya no hace falta, gracias») y lo escucha la pantalla de alerta vecinal (G3), para que
 * el vecino vea «Esta emergencia ya terminó» al instante, sin esperar a la siguiente consulta.
 */
type Oyente = (emergenciaId: string) => void;

const oyentes = new Set<Oyente>();

export function avisarEmergenciaTerminada(emergenciaId: string): void {
  for (const o of oyentes) o(emergenciaId);
}

export function alTerminarEmergencia(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}
