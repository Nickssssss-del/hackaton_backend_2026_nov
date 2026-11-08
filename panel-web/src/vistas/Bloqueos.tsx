/**
 * Vista. Usuarios bloqueados («Desbloquear») y reportes de personas («Bloquear», «Descartar reporte»).
 */
import { useState } from "react";
import { useBloqueos } from "../controladores/useBloqueos";
import { fecha, idCorto, motivoComunidad } from "./etiquetas";
import { FormularioBloqueo } from "./FormularioBloqueo";
import { Mensajes } from "./Mensajes";

export function Bloqueos() {
  const b = useBloqueos();
  const [bloqueando, setBloqueando] = useState<string | null>(null);
  const ocupado = b.enCurso !== null;
  const listo = !b.cargando && !b.error;

  const confirmarDesbloqueo = (userId: string) => {
    if (window.confirm(`¿Desbloquear a ${idCorto(userId)}? Podrá volver a usar la app.`)) void b.quitarBloqueo(userId);
  };

  const confirmarDescarte = (id: string) => {
    if (window.confirm("¿Descartar este reporte? No se puede deshacer.")) void b.descartar(id);
  };

  return (
    <section aria-labelledby="titulo-bloqueos">
      <h2 id="titulo-bloqueos" className="text-xl font-bold">
        Bloqueos
      </h2>
      <p className="mt-1 text-stone-700">
        Un usuario bloqueado no puede publicar, comentar, reportar ni ofrecer ayuda, y deja de recibir alertas de
        vecinos.
      </p>

      <Mensajes cargando={b.cargando} error={b.error} aviso={b.aviso} onRecargar={() => void b.recargar()} />

      <h3 className="mt-6 text-lg font-semibold">Usuarios bloqueados</h3>
      {listo && b.bloqueos.length === 0 ? <p className="mt-3 rounded-xl bg-stone-100 p-4">No hay bloqueos.</p> : null}
      <ul className="mt-3 space-y-3">
        {b.bloqueos.map((bloqueo) => (
          <li
            key={bloqueo.user_id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4"
          >
            <div>
              <h4 className="font-semibold">{idCorto(bloqueo.user_id)}</h4>
              {bloqueo.motivo ? <p>{bloqueo.motivo}</p> : null}
              <p className="text-sm text-stone-600">
                {fecha(bloqueo.creado_en)}
                {bloqueo.creado_por
                  ? ` · bloqueado por ${bloqueo.creado_por === b.miId ? "ti" : idCorto(bloqueo.creado_por)}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => confirmarDesbloqueo(bloqueo.user_id)}
              aria-label={`Desbloquear a ${idCorto(bloqueo.user_id)}`}
              className="rounded-lg border border-stone-400 px-4 py-2 font-medium disabled:opacity-60"
            >
              {b.enCurso === bloqueo.user_id ? "Guardando…" : "Desbloquear"}
            </button>
          </li>
        ))}
      </ul>

      <h3 className="mt-8 text-lg font-semibold">Reportes de personas</h3>
      <p className="mt-1 text-sm text-stone-700">Un reporte a una persona no oculta nada: lo decide un admin.</p>
      {listo && b.reportes.length === 0 ? (
        <p className="mt-3 rounded-xl bg-stone-100 p-4">No hay reportes de personas.</p>
      ) : null}
      <ul className="mt-3 space-y-3">
        {b.reportes.map((reporte) => {
          const yaBloqueado = b.bloqueados.has(reporte.usuario_id);
          const persona = idCorto(reporte.usuario_id);
          return (
            <li key={reporte.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold">{persona}</h4>
                  <p className="text-sm text-stone-600">
                    {motivoComunidad(reporte.motivo)} · {fecha(reporte.creado_en)}
                  </p>
                </div>
                {yaBloqueado ? (
                  <span className="rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-800">Bloqueado</span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {yaBloqueado ? null : (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => setBloqueando(reporte.id)}
                    aria-expanded={bloqueando === reporte.id}
                    aria-label={`Bloquear a ${persona}`}
                    className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white disabled:opacity-60"
                  >
                    Bloquear
                  </button>
                )}
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => confirmarDescarte(reporte.id)}
                  aria-label={`Descartar el reporte a ${persona}`}
                  className="rounded-lg border border-stone-400 px-4 py-2 font-medium disabled:opacity-60"
                >
                  {b.enCurso === reporte.id ? "Guardando…" : "Descartar reporte"}
                </button>
              </div>
              {bloqueando === reporte.id && !yaBloqueado ? (
                <FormularioBloqueo
                  persona={persona}
                  enviando={b.enCurso === reporte.usuario_id}
                  onBloquear={(motivo) => b.bloquearUsuario(reporte.usuario_id, motivo)}
                  onCancelar={() => setBloqueando(null)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
