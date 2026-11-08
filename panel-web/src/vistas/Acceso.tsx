/**
 * Vista. Inicio de sesión del admin con correo y contraseña de Supabase Auth.
 */
import { useState } from "react";
import logoKuna from "../assets/kuna.png";

type Props = {
  error: string | null;
  enviando: boolean;
  onEntrar: (correo: string, clave: string) => void;
};

export function Acceso({ error, enviando, onEntrar }: Props) {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  return (
    <div className="grid min-h-screen min-[800px]:grid-cols-2">
      <aside className="flex flex-col items-center justify-center bg-[#1F4E9C] px-8 py-12 text-center text-white min-[800px]:min-h-screen min-[800px]:px-12">
        <div
          role="img"
          aria-label="Kuna"
          className="h-52 w-52 bg-white"
          style={{
            maskImage: `url(${logoKuna})`,
            WebkitMaskImage: `url(${logoKuna})`,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskSize: "220%",
            WebkitMaskSize: "220%",
          }}
        />
        <p className="mt-6 text-3xl font-bold">Kuna</p>
        <p className="mt-4 max-w-sm text-xl leading-snug">Cuidamos el barrio sin ver datos de nadie.</p>
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
            <span className="relative mt-1 block">
              <input
                type={mostrarPassword ? "text" : "password"}
                value={clave}
                onChange={(evento) => setClave(evento.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 pr-12 text-base font-normal"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword((visible) => !visible)}
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={mostrarPassword}
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#6B7280]"
              >
                {mostrarPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </span>
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
