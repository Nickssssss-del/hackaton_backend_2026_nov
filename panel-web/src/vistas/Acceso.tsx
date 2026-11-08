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
    <div className="grid min-h-screen min-[800px]:grid-cols-2">
      <aside className="flex flex-col justify-between bg-[#1F4E9C] px-8 py-10 text-white min-[800px]:min-h-screen min-[800px]:px-12">
        <p className="text-3xl font-bold">Kuna</p>
        <p className="mt-8 max-w-sm text-xl leading-snug">Cuidamos el barrio sin ver datos de nadie.</p>
      </aside>
      <main className="flex items-center bg-[#F5F3EE] px-6 py-10">
        <form
          className="mx-auto w-full max-w-md"
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault();
            onEntrar(correo, clave);
          }}
        >
          <h1 className="text-3xl font-bold text-stone-900">Entrar al panel</h1>
          <label className="mt-8 block text-base font-medium">
            Correo
            <input
              type="email"
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              autoComplete="email"
              required
              className="mt-1 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base font-normal"
            />
          </label>
          <label className="mt-4 block text-base font-medium">
            Contraseña
            <input
              type="password"
              value={clave}
              onChange={(evento) => setClave(evento.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base font-normal"
            />
          </label>
          {error ? (
            <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-900">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={enviando}
            className="mt-6 w-full rounded-full bg-[#1F4E9C] px-4 py-3 text-base font-medium text-white hover:bg-[#163a74] disabled:bg-stone-300 disabled:text-stone-700"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}
