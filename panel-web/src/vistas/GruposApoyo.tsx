/**
 * Vista. Grupos de apoyo: primero los que faltan verificar.
 */
import { useGrupos } from "../controladores/useGrupos";
import { tipoGrupo } from "./etiquetas";
import { Mensajes } from "./Mensajes";

export function GruposApoyo() {
  const { grupos, cargando, error, aviso, enCurso, recargar, verificar } = useGrupos();

  return (
    <section aria-labelledby="titulo-grupos">
      <h2 id="titulo-grupos" className="text-xl font-bold">
        Grupos de apoyo
      </h2>
      <p className="mt-1 text-stone-700">
        Los vecinos ven la marca «Verificado» en los grupos que confirmó el equipo.
      </p>

      <Mensajes cargando={cargando} error={error} aviso={aviso} onRecargar={() => void recargar()} />

      {!cargando && !error && grupos.length === 0 ? (
        <p className="mt-6 rounded-xl bg-stone-100 p-4">No hay grupos de apoyo.</p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {grupos.map((grupo) => (
          <li
            key={grupo.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4"
          >
            <div>
              <h3 className="font-semibold">{grupo.nombre}</h3>
              <p className="text-sm text-stone-600">
                {tipoGrupo(grupo.tipo)}
                {grupo.zona ? ` · ${grupo.zona}` : ""}
                {grupo.contacto ? ` · ${grupo.contacto}` : ""}
              </p>
              {grupo.direccion ? <p className="text-sm text-stone-600">{grupo.direccion}</p> : null}
            </div>
            {grupo.verificada ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                ✓ Verificado
              </span>
            ) : (
              <button
                type="button"
                disabled={enCurso !== null}
                onClick={() => void verificar(grupo.id)}
                aria-label={`Marcar como verificada: ${grupo.nombre}`}
                className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white disabled:opacity-60"
              >
                {enCurso === grupo.id ? "Guardando…" : "Marcar como verificada"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
