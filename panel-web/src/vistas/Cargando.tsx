/**
 * Vista. Indicador de carga compartido. Solo presentación.
 */
export function Cargando() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-10">
      <span className="cargando-aro" aria-hidden="true" />
      <p className="text-base text-stone-500">Cargando…</p>
    </div>
  );
}
