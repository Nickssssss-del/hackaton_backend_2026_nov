/**
 * Vista. Formulario del usuario de prueba.
 */
import { useState } from "react";

type Props = {
  error: string | null;
  onEntrar: (usuario: string, clave: string) => void;
};

export function Acceso({ error, onEntrar }: Props) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-bold">Panel del barrio</h1>
      <p className="mt-2">Entra con el usuario de prueba.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          onEntrar(usuario, clave);
        }}
      >
        <label className="block">
          Usuario
          <input
            value={usuario}
            onChange={(evento) => setUsuario(evento.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-lg bg-stone-100 px-3 py-2"
          />
        </label>
        <label className="block">
          Contraseña
          <input
            type="password"
            value={clave}
            onChange={(evento) => setClave(evento.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg bg-stone-100 px-3 py-2"
          />
        </label>
        {error ? <p>{error}</p> : null}
        <button type="submit" className="rounded-xl bg-stone-900 px-4 py-2 text-white">
          Entrar
        </button>
      </form>
    </main>
  );
}
