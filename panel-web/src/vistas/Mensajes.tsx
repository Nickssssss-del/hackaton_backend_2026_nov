/**
 * Vista. Avisos de estado compartidos por las pantallas.
 */
type Props = {
  cargando: boolean;
  error: string | null;
  aviso: string | null;
  onRecargar: () => void;
};

export function Mensajes({ cargando, error, aviso, onRecargar }: Props) {
  return (
    <div className="mt-4 space-y-2" aria-live="polite">
      {cargando ? <p className="text-stone-600">Cargando…</p> : null}
      {error ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-red-800">
          <p>{error}</p>
          <button type="button" onClick={onRecargar} className="shrink-0 font-medium underline">
            Recargar
          </button>
        </div>
      ) : null}
      {aviso ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{aviso}</p> : null}
    </div>
  );
}
