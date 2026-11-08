/**
 * Vista. Emergencias cerradas de los últimos 7 días. Solo lectura.
 * No muestra nombre, dirección, mapa ni coordenadas. De cada vecino, solo su id.
 */
import { useEmergenciasCerradas } from "../controladores/useEmergenciasCerradas";
import type { VecinoCerrado } from "../modelos/emergenciasCerradas";
import { fecha, idCorto } from "./etiquetas";
import { Cargando } from "./Cargando";
import { Mensajes } from "./Mensajes";

function Etiqueta({ children, tono }: { children: string; tono: "ambar" | "gris" | "rojo" }) {
  const clases =
    tono === "ambar"
      ? "bg-amber-100 text-amber-900"
      : tono === "rojo"
        ? "bg-red-100 text-red-900"
        : "bg-stone-100 text-stone-800";
  return <span className={`rounded-full px-2.5 py-1 text-base font-medium ${clases}`}>{children}</span>;
}

function ListaVecinos({ vecinos, conFecha }: { vecinos: VecinoCerrado[]; conFecha: boolean }) {
  return (
    <ul className="mt-2 space-y-2 text-base">
      {vecinos.map((vecino) => (
        <li key={vecino.vecino_id} className="flex flex-wrap justify-between gap-2">
          <span>{idCorto(vecino.vecino_id)}</span>
          <span className="text-stone-700">
            {conFecha && vecino.vio_datos_en ? fecha(vecino.vio_datos_en) : null}
            {conFecha && vecino.vio_datos_en ? " · " : null}
            {vecino.reportado ? "Reportado" : "No reportado"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function EmergenciasCerradas() {
  const { emergencias, cargando, error, recargar } = useEmergenciasCerradas();
  const listo = !cargando && !error;

  return (
    <section aria-labelledby="titulo-emergencias-cerradas">
      <h2 id="titulo-emergencias-cerradas" className="text-3xl font-bold text-stone-900">
        Emergencias cerradas
      </h2>
      <p className="mt-1 text-base text-stone-600">
        Últimos 7 días. Solo lectura. El identificador sirve para buscar a la persona en Bloqueos.
      </p>

      {cargando ? <Cargando /> : null}
      <Mensajes cargando={false} error={error} aviso={null} onRecargar={() => void recargar()} />

      {listo && emergencias.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-stone-300 bg-stone-100 p-4 text-base text-stone-800">No hay emergencias cerradas en los últimos 7 días.</p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {emergencias.map((emergencia) => (
          <li key={emergencia.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Cerrada el {fecha(emergencia.cerrada_en)}</h3>
                <p className="mt-1 text-base text-stone-700">Iniciada el {fecha(emergencia.creado_en)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {emergencia.practica ? <Etiqueta tono="ambar">Práctica</Etiqueta> : <Etiqueta tono="gris">Real</Etiqueta>}
                {emergencia.reportados.length > 0 ? <Etiqueta tono="rojo">Reportada</Etiqueta> : null}
              </div>
            </div>

            <p className="mt-4 text-base font-medium">
              {emergencia.fueron} {emergencia.fueron === 1 ? "vecino fue" : "vecinos fueron"}
            </p>

            <h4 className="mt-4 text-base font-semibold">Vieron los datos</h4>
            {emergencia.vieronDatos.length === 0 ? (
              <p className="mt-1 text-base text-stone-700">Nadie vio los datos.</p>
            ) : (
              <ListaVecinos vecinos={emergencia.vieronDatos} conFecha />
            )}

            {emergencia.reportados.some((v) => v.vio_datos_en === null) ? (
              <>
                <h4 className="mt-4 text-base font-semibold">Reportados</h4>
                <ListaVecinos vecinos={emergencia.reportados.filter((v) => v.vio_datos_en === null)} conFecha={false} />
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
