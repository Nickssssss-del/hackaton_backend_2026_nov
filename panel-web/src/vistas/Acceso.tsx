/**
 * Vista. Inicio de sesión del admin con correo y contraseña de Supabase Auth.
 */
import { useState } from "react";

type Props = {
  error: string | null;
  enviando: boolean;
  onEntrar: (correo: string, clave: string) => void;
};

export function Acceso({ error, enviando, onEntrar }: Props) {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-bold">Panel del barrio</h1>
      <p className="mt-2 text-stone-700">
        Entra con tu cuenta de administrador. El permiso se da solo desde Supabase.
      </p>
      <form
        className="mt-6 space-y-4"
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          onEntrar(correo, clave);
        }}
      >
        <label className="block font-medium">
          Correo
          <input
            type="email"
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            autoComplete="email"
            required
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
          />
        </label>
        <label className="block font-medium">
          Contraseña
          <input
            type="password"
            value={clave}
            onChange={(evento) => setClave(evento.target.value)}
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal"
          />
        </label>
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-stone-900 px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
