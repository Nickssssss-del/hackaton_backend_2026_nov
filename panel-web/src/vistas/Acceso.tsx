/**
 * Vista. Inicio de sesión del admin con correo y contraseña de Supabase Auth,
 * más dos accesos de demostración con datos de ejemplo.
 */
import { useState } from "react";
import { demoPermitido } from "../modelos/supabase";
import { Icono, Logo } from "./ui";

type Props = {
  error: string | null;
  enviando: boolean;
  configurado: boolean;
  onEntrar: (correo: string, clave: string) => void;
  onDemo: (admin: boolean) => void;
};

export function Acceso({ error, enviando, configurado, onEntrar, onDemo }: Props) {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");

  return (
    <div className="grid min-h-screen lg:grid-cols-[43%_1fr]">
      <aside className="relative flex flex-col justify-between gap-10 bg-marca px-8 py-10 text-white sm:px-16 sm:py-14">
        <div className="flex items-center gap-3">
          <Logo className="h-12 w-12" />
          <span className="font-titulo text-2xl font-bold">Vecinos</span>
        </div>
        <Logo className="mx-auto hidden h-64 w-64 text-white/95 lg:block" />
        <div>
          <p className="font-titulo text-3xl font-bold leading-tight sm:text-4xl">
            Cuidamos el barrio
            <br />
            sin ver datos de nadie.
          </p>
          <p className="mt-3 text-lg text-white/85">Moderación y monitoreo para el equipo administrador.</p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Entrar al panel</h1>
          <p className="mt-2 text-lg text-tinta-2">Solo para cuentas administradoras.</p>

          <form
            className="mt-7 space-y-5"
            noValidate
            onSubmit={(evento) => {
              evento.preventDefault();
              onEntrar(correo, clave);
            }}
          >
            <label className="block font-titulo font-semibold">
              Correo
              <input
                type="email"
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
                autoComplete="email"
                placeholder="tu-correo@ejemplo.pe"
                required
                className="mt-2 h-14 w-full rounded-xl border border-borde-fuerte bg-superficie px-4 font-sans text-lg font-normal"
              />
            </label>
            <label className="block font-titulo font-semibold">
              Contraseña
              <input
                type="password"
                value={clave}
                onChange={(evento) => setClave(evento.target.value)}
                autoComplete="current-password"
                required
                className="mt-2 h-14 w-full rounded-xl border border-borde-fuerte bg-superficie px-4 font-sans text-lg font-normal"
              />
            </label>
            {error ? (
              <p role="alert" className="rounded-xl bg-rojo-suave px-4 py-3 text-rojo">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={enviando || !configurado}
              className="h-14 w-full rounded-xl bg-marca font-titulo text-lg font-semibold text-white transition-colors hover:bg-marca-oscuro disabled:opacity-60"
            >
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="mt-5 flex items-start gap-3 text-[15px] text-tinta-2">
            <Icono nombre="info" className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              El alta de administradores se hace a mano en la tabla <code className="font-mono text-sm">admins</code>.
              {configurado ? null : " Para entrar con tu cuenta, configura Supabase en panel-web/.env."}
            </span>
          </p>

          {/* Solo al desarrollar o con VITE_MOSTRAR_DEMO=true: en producción no se ven. */}
          {demoPermitido ? (
            <div className="mt-6 flex flex-wrap gap-3 border-t border-dashed border-borde-fuerte pt-6">
              <button
                type="button"
                onClick={() => onDemo(true)}
                className="rounded-full border border-marca-barra bg-marca-suave px-4 py-2 font-titulo text-sm font-semibold text-tinta hover:bg-marca-barra/40"
              >
                Demo: cuenta admin
              </button>
              <button
                type="button"
                onClick={() => onDemo(false)}
                className="rounded-full border border-borde-fuerte bg-superficie px-4 py-2 font-titulo text-sm font-semibold text-tinta hover:bg-fondo"
              >
                Demo: cuenta sin permiso
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
