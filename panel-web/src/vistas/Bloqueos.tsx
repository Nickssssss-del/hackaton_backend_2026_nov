/**
 * Vista. Usuarios bloqueados («Desbloquear») y reportes de personas («Bloquear», «Descartar reporte»).
 */
import { useState } from "react";
import { useBloqueos } from "../controladores/useBloqueos";
import type { ReportePersona } from "../modelos/bloqueos";
import { fecha, idCorto, motivoComunidad } from "./etiquetas";
import { Cargando } from "./Cargando";
import { Mensajes } from "./Mensajes";

const MAXIMO = 140;

/** El mismo idCorto que Emergencias cerradas, y el nombre corto al lado si la base lo devolvió. */
function etiqueta(id: string, fichas: Map<string, { nombre: string | null }>): string {
  const identificador = idCorto(id);
  const corto = fichas.get(id)?.nombre;
  return corto ? `${corto} · ${identificador}` : identificador;
}

function agrupar(reportes: ReportePersona[]): ReportePersona[][] {
  const grupos = new Map<string, ReportePersona[]>();
  for (const reporte of reportes) {
    const lista = grupos.get(reporte.usuario_id) ?? [];
    lista.push(reporte);
    grupos.set(reporte.usuario_id, lista);
  }
  return [...grupos.values()];
}

function contextoDe(reportes: ReportePersona[]): string | null {
  if (reportes.some((reporte) => reporte.publicacion_id)) return "Se reportó una publicación.";
  if (reportes.some((reporte) => reporte.comentario_id)) return "Se reportó un comentario.";
  return null;
}

export function Bloqueos() {
  const b = useBloqueos();
  const [bloqueando, setBloqueando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [revisar, setRevisar] = useState(false);
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const ocupado = b.enCurso !== null;
  const listo = !b.cargando && !b.error;
  const personaDe = (id: string) => etiqueta(id, b.fichas);

  const confirmarDesbloqueo = (userId: string) => {
    if (window.confirm(`¿Desbloquear a ${personaDe(userId)}? Podrá volver a usar la app.`)) void b.quitarBloqueo(userId);
  };

  const confirmarDescarte = (id: string) => {
    if (window.confirm("¿Descartar este reporte? No se puede deshacer.")) void b.descartar(id);
  };

  const abrirBloqueo = (usuarioId: string) => {
    setBloqueando(usuarioId);
    setMotivo("");
    setRevisar(false);
    setErrorMotivo(null);
  };

  const copiar = async (usuarioId: string) => {
    try {
      await navigator.clipboard.writeText(usuarioId);
      setCopiado(usuarioId);
    } catch {
      setCopiado(null);
    }
  };

  return (
    <section aria-labelledby="titulo-bloqueos">
      <h2 id="titulo-bloqueos" className="text-3xl font-bold text-stone-900">
        Bloqueos
      </h2>
      <p className="mt-1 text-base text-stone-600">
        Un usuario bloqueado no puede publicar, comentar, reportar ni ofrecer ayuda, y deja de recibir alertas de
        vecinos.
      </p>

      {b.cargando ? <Cargando /> : null}
      <Mensajes cargando={false} error={b.error} aviso={b.aviso} onRecargar={() => void b.recargar()} />
      {b.sinNombres ? (
        <p className="mt-3 rounded-2xl border border-stone-300 bg-stone-100 p-4 text-base text-stone-800">
          No se pudieron leer los nombres. Se muestra solo el identificador.
        </p>
      ) : null}

      <h3 className="mt-6 text-lg font-semibold">Usuarios bloqueados</h3>
      {listo && b.bloqueos.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-stone-300 bg-stone-100 p-4 text-base text-stone-800">No hay bloqueos.</p>
      ) : null}
      <ul className="mt-3 space-y-4">
        {b.bloqueos.map((bloqueo) => (
          <li
            key={bloqueo.user_id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div>
              <h4 className="text-lg font-semibold">{personaDe(bloqueo.user_id)}</h4>
              {bloqueo.motivo ? <p className="mt-1 text-base">{bloqueo.motivo}</p> : null}
              <p className="mt-1 text-base text-stone-700">
                {fecha(bloqueo.creado_en)}
                {bloqueo.creado_por
                  ? ` · bloqueado por ${bloqueo.creado_por === b.miId ? "ti" : personaDe(bloqueo.creado_por)}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => confirmarDesbloqueo(bloqueo.user_id)}
              aria-label={`Desbloquear a ${personaDe(bloqueo.user_id)}`}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-base font-medium text-stone-900 hover:bg-stone-100 disabled:border-stone-300 disabled:text-stone-600"
            >
              {b.enCurso === bloqueo.user_id ? "Guardando…" : "Desbloquear"}
            </button>
          </li>
        ))}
      </ul>

      <h3 className="mt-8 text-lg font-semibold">Reportes de personas</h3>
      <p className="mt-1 text-base text-stone-700">Un reporte a una persona no oculta nada: lo decide un admin.</p>
      {listo && b.reportes.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-stone-300 bg-stone-100 p-4 text-base text-stone-800">
          No hay reportes de personas.
        </p>
      ) : null}
      <ul className="mt-3 space-y-4">
        {agrupar(b.reportes).map((grupo) => {
          const usuarioId = grupo[0].usuario_id;
          const ficha = b.fichas.get(usuarioId);
          const identificador = idCorto(usuarioId);
          const yaBloqueado = b.bloqueados.has(usuarioId);
          const motivos = [...new Set(grupo.map((reporte) => reporte.motivo))];
          const contexto = contextoDe(grupo);
          const abierto = bloqueando === usuarioId;
          return (
            <li key={usuarioId} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold">{ficha?.nombre ?? "Sin nombre corto"}</h4>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-base">
                    <span className="font-mono text-stone-800">{identificador}</span>
                    <button
                      type="button"
                      onClick={() => void copiar(usuarioId)}
                      className="rounded-full border border-stone-300 px-3 py-1 text-base font-medium hover:bg-stone-100"
                    >
                      {copiado === usuarioId ? "Copiado" : "Copiar"}
                    </button>
                  </p>
                  {ficha?.zona ? <p className="mt-1 text-base text-stone-700">{ficha.zona}</p> : null}
                  <p className="mt-2 text-base text-stone-700">
                    {grupo.length} {grupo.length === 1 ? "reporte" : "reportes"}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {motivos.map((motivoReporte) => (
                      <li
                        key={motivoReporte}
                        className="rounded-full bg-stone-200 px-3 py-1 text-base font-medium text-stone-900"
                      >
                        {motivoComunidad(motivoReporte)}
                      </li>
                    ))}
                  </ul>
                  {contexto ? <p className="mt-2 text-base text-stone-700">{contexto}</p> : null}
                </div>
                {yaBloqueado ? (
                  <span className="rounded-full bg-stone-200 px-3 py-1 text-base font-medium text-stone-900">Bloqueado</span>
                ) : null}
              </div>
              <ul className="mt-3 space-y-2">
                {grupo.map((reporte) => (
                  <li key={reporte.id} className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base text-stone-700">{fecha(reporte.creado_en)}</p>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => confirmarDescarte(reporte.id)}
                      aria-label={`Descartar el reporte a ${identificador}`}
                      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-base font-medium text-stone-900 hover:bg-stone-100 disabled:border-stone-300 disabled:text-stone-600"
                    >
                      {b.enCurso === reporte.id ? "Guardando…" : "Descartar reporte"}
                    </button>
                  </li>
                ))}
              </ul>
              {yaBloqueado ? null : (
                <div className="mt-3">
                  {abierto ? null : (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => abrirBloqueo(usuarioId)}
                      aria-expanded={false}
                      aria-label={`Bloquear a ${identificador}`}
                      className="rounded-full bg-[#1F4E9C] px-4 py-2 text-base font-medium text-white hover:bg-[#163a74] disabled:bg-stone-300 disabled:text-stone-700"
                    >
                      Bloquear
                    </button>
                  )}
                  {abierto && !revisar ? (
                    <form
                      className="rounded-2xl border border-stone-300 bg-stone-50 p-3"
                      noValidate
                      onSubmit={(evento) => {
                        evento.preventDefault();
                        if (!motivo.trim()) {
                          setErrorMotivo("Escribe el motivo del bloqueo.");
                          return;
                        }
                        setErrorMotivo(null);
                        setRevisar(true);
                      }}
                    >
                      <label className="block text-base font-semibold" htmlFor={`motivo-${usuarioId}`}>
                        Motivo para bloquear a {ficha?.nombre ?? identificador}
                      </label>
                      <textarea
                        id={`motivo-${usuarioId}`}
                        value={motivo}
                        onChange={(evento) => setMotivo(evento.target.value)}
                        maxLength={MAXIMO}
                        rows={2}
                        className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base"
                      />
                      {errorMotivo ? <p className="mt-1 text-base text-red-800">{errorMotivo}</p> : null}
                      <p className="mt-1 text-base text-stone-600">
                        {motivo.length}/{MAXIMO}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="submit"
                          className="rounded-full bg-[#1F4E9C] px-4 py-2 text-base font-medium text-white hover:bg-[#163a74]"
                        >
                          Revisar
                        </button>
                        <button
                          type="button"
                          onClick={() => setBloqueando(null)}
                          className="rounded-full border border-stone-300 px-4 py-2 text-base font-medium hover:bg-stone-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : null}
                  {abierto && revisar ? (
                    <div className="rounded-2xl border border-stone-300 bg-stone-50 p-3">
                      <p className="text-base font-semibold">Confirma el bloqueo</p>
                      <p className="mt-2 text-base">{ficha?.nombre ?? "Sin nombre corto"}</p>
                      <p className="font-mono text-base text-stone-800">{identificador}</p>
                      <p className="mt-2 text-base">{motivo.trim()}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() => void b.bloquearUsuario(usuarioId, motivo)}
                          className="rounded-full bg-[#1F4E9C] px-4 py-2 text-base font-medium text-white hover:bg-[#163a74] disabled:bg-stone-300 disabled:text-stone-700"
                        >
                          {b.enCurso === usuarioId ? "Guardando…" : "Confirmar bloqueo"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevisar(false)}
                          className="rounded-full border border-stone-300 px-4 py-2 text-base font-medium hover:bg-stone-100"
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
