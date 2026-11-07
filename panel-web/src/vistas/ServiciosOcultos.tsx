/**
 * Vista. Servicios ocultos con sus reportes: "Volver a mostrar" o "Borrar".
 */
import { useServiciosOcultos } from "../controladores/useServiciosOcultos";
import { fecha, motivoReporte, oficio } from "./etiquetas";
import { Mensajes } from "./Mensajes";

export function ServiciosOcultos() {
  const { servicios, cargando, error, aviso, enCurso, recargar, mostrar, borrar } = useServiciosOcultos();

  const confirmarBorrado = (id: string, nombre: string) => {
    const seguro = window.confirm(
      `¿Borrar "${nombre}"? También se borran sus reportes y vistos buenos. No se puede deshacer.`,
    );
    if (seguro) void borrar(id);
  };

  return (
    <section aria-labelledby="titulo-ocultos">
      <h2 id="titulo-ocultos" className="text-xl font-bold">
        Servicios ocultos
      </h2>
      <p className="mt-1 text-stone-700">
        Se ocultan solos con 3 reportes. Al volver a mostrarlos, el conteo empieza de cero.
      </p>

      <Mensajes cargando={cargando} error={error} aviso={aviso} onRecargar={() => void recargar()} />

      {!cargando && !error && servicios.length === 0 ? (
        <p className="mt-6 rounded-xl bg-stone-100 p-4">No hay servicios ocultos.</p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {servicios.map((servicio) => {
          const nombre = servicio.nombre_negocio ?? oficio(servicio.oficio);
          const ocupado = enCurso === servicio.id;
          return (
            <li key={servicio.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{nombre}</h3>
                  <p className="text-sm text-stone-600">
                    {oficio(servicio.oficio)}
                    {servicio.zona ? ` · ${servicio.zona}` : ""} · publicado {fecha(servicio.creado_en)}
                  </p>
                </div>
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-800">
                  {servicio.reportes.length} {servicio.reportes.length === 1 ? "reporte" : "reportes"}
                </span>
              </div>
              {servicio.descripcion ? <p className="mt-2">{servicio.descripcion}</p> : null}

              <h4 className="mt-3 text-sm font-semibold">Reportes</h4>
              {servicio.reportes.length === 0 ? (
                <p className="text-sm text-stone-600">Sin reportes: lo ocultó un admin.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {servicio.reportes.map((reporte) => {
                    const previo =
                      servicio.revisado_en !== null &&
                      Date.parse(reporte.creado_en) <= Date.parse(servicio.revisado_en);
                    return (
                      <li key={reporte.id} className="flex justify-between gap-3">
                        <span>
                          {motivoReporte(reporte.motivo)}
                          {previo ? <span className="text-stone-500"> (antes de la última revisión)</span> : null}
                        </span>
                        <span className="text-stone-600">{fecha(reporte.creado_en)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={enCurso !== null}
                  onClick={() => void mostrar(servicio.id)}
                  aria-label={`Volver a mostrar ${nombre}`}
                  className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white disabled:opacity-60"
                >
                  {ocupado ? "Guardando…" : "Volver a mostrar"}
                </button>
                <button
                  type="button"
                  disabled={enCurso !== null}
                  onClick={() => confirmarBorrado(servicio.id, nombre)}
                  aria-label={`Borrar ${nombre}`}
                  className="rounded-lg border border-red-700 px-4 py-2 font-medium text-red-800 disabled:opacity-60"
                >
                  Borrar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
