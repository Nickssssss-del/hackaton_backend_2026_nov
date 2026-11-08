/**
 * Vista. Grupos de apoyo: primero los que faltan verificar.
 */
import { useGrupos } from "../controladores/useGrupos";
import { tipoGrupo } from "./etiquetas";
import { Cargando } from "./Cargando";
import { Mensajes } from "./Mensajes";

export function GruposApoyo() {
  const { grupos, cargando, error, aviso, enCurso, recargar, verificar } = useGrupos();

  return (
    <section aria-labelledby="titulo-grupos">
      <h2 id="titulo-grupos" className="text-3xl font-bold text-stone-900">
        Grupos de apoyo
      </h2>
      <p className="mt-1 text-base text-stone-600">
        Grupos de ayuda entre vecinos. La marca «Verificado» aparece en los que confirmó el equipo.
      </p>

      {cargando ? <Cargando /> : null}
      <Mensajes cargando={false} error={error} aviso={aviso} onRecargar={() => void recargar()} />

      {!cargando && !error && grupos.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-stone-300 bg-stone-100 p-4 text-base text-stone-800">No hay grupos de apoyo.</p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {grupos.map((grupo) => (
          <li
            key={grupo.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div>
              <h3 className="text-lg font-semibold">{grupo.nombre}</h3>
              <p className="mt-1 text-base text-stone-700">
                {tipoGrupo(grupo.tipo)}
                {grupo.zona ? ` · ${grupo.zona}` : ""}
                {grupo.contacto ? ` · ${grupo.contacto}` : ""}
              </p>
              {grupo.direccion ? <p className="mt-1 text-base text-stone-700">{grupo.direccion}</p> : null}
            </div>
            {grupo.verificada ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-base font-medium text-emerald-900">
                ✓ Verificado
              </span>
            ) : (
              <button
                type="button"
                disabled={enCurso !== null}
                onClick={() => void verificar(grupo.id)}
                aria-label={`Marcar como verificada: ${grupo.nombre}`}
                className="rounded-full bg-[#1F4E9C] px-4 py-2 text-base font-medium text-white hover:bg-[#163a74] disabled:bg-stone-300 disabled:text-stone-700"
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
