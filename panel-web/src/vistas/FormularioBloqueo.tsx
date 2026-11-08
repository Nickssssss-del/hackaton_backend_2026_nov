/**
 * Vista. Formulario de motivo para bloquear a un usuario (1 a 140 caracteres).
 * Lo usan «Comunidad oculta» y «Bloqueos».
 */
import { useId, useState } from "react";

const MAXIMO = 140;

type Props = {
  persona: string;
  enviando: boolean;
  /** Devuelve true si quedó bloqueado; entonces el formulario se cierra. */
  onBloquear: (motivo: string) => Promise<boolean>;
  onCancelar: () => void;
};

export function FormularioBloqueo({ persona, enviando, onBloquear, onCancelar }: Props) {
  const id = useId();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-3 rounded-lg border border-stone-300 bg-stone-50 p-3"
      noValidate
      onSubmit={async (evento) => {
        evento.preventDefault();
        if (!motivo.trim()) {
          setError("Escribe el motivo del bloqueo.");
          return;
        }
        setError(null);
        if (await onBloquear(motivo)) onCancelar();
      }}
    >
      <label htmlFor={`${id}-motivo`} className="block text-sm font-semibold">
        Motivo para bloquear a {persona}
      </label>
      <textarea
        id={`${id}-motivo`}
        value={motivo}
        onChange={(evento) => setMotivo(evento.target.value)}
        maxLength={MAXIMO}
        rows={2}
        autoFocus
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-contador${error ? ` ${id}-error` : ""}`}
        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
      />
      <div className="mt-1 flex justify-between gap-3 text-sm">
        <p id={`${id}-error`} className="text-red-800">
          {error}
        </p>
        <p id={`${id}-contador`} className="shrink-0 text-stone-600" aria-live="polite">
          {motivo.length}/{MAXIMO}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-red-800 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {enviando ? "Bloqueando…" : "Bloquear"}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-lg border border-stone-400 px-4 py-2 font-medium">
          Cancelar
        </button>
      </div>
    </form>
  );
}
