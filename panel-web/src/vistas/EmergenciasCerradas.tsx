/**
 * Vista. Emergencias cerradas de los últimos 7 días. Solo lectura.
 * No muestra nombre, dirección, mapa ni coordenadas. De cada vecino, solo su id.
 */
import { useEmergenciasCerradas } from "../controladores/useEmergenciasCerradas";
import type { VecinoCerrado } from "../modelos/emergenciasCerradas";
import { fecha, idCorto } from "./etiquetas";
import { Mensajes } from "./Mensajes";

function Etiqueta({ children, tono }: { children: string; tono: "ambar" | "gris" | "rojo" }) {
  const clases =
    tono === "ambar"
      ? "bg-amber-100 text-amber-900"
      : tono === "rojo"
        ? "bg-red-100 text-red-900"
        : "bg-stone-100 text-stone-800";
  return <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${clases}`}>{children}</span>;
}

function ListaVecinos({ vecinos, conFecha }: { vecinos: VecinoCerrado[]; conFecha: boolean }) {
  return (
    <ul className="mt-1 space-y-1 text-sm">
      {vecinos.map((vecino) => (
        <li key={vecino.vecino_id} className="flex flex-wrap justify-between gap-2">
          <span>{idCorto(vecino.vecino_id)}</span>
          <span className="text-stone-600">
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
      <h2 id="titulo-emergencias-cerradas" className="text-xl font-bold">
        Emergencias cerradas
      </h2>
      <p className="mt-1 text-stone-700">
        Últimos 7 días. Solo lectura. El identificador sirve para buscar a la persona en Bloqueos.
      </p>

      <Mensajes cargando={cargando} error={error} aviso={null} onRecargar={() => void recargar()} />

      {listo && emergencias.length === 0 ? (
        <p className="mt-6 rounded-xl bg-stone-100 p-4">No hay emergencias cerradas en los últimos 7 días.</p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {emergencias.map((emergencia) => (
          <li key={emergencia.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">Cerrada el {fecha(emergencia.cerrada_en)}</h3>
                <p className="text-sm text-stone-600">Iniciada el {fecha(emergencia.creado_en)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {emergencia.practica ? <Etiqueta tono="ambar">Práctica</Etiqueta> : <Etiqueta tono="gris">Real</Etiqueta>}
                {emergencia.reportados.length > 0 ? <Etiqueta tono="rojo">Reportada</Etiqueta> : null}
              </div>
            </div>

            <p className="mt-3 font-medium">
              {emergencia.fueron} {emergencia.fueron === 1 ? "vecino fue" : "vecinos fueron"}
            </p>

            <h4 className="mt-3 text-sm font-semibold">Vieron los datos</h4>
            {emergencia.vieronDatos.length === 0 ? (
              <p className="text-sm text-stone-600">Nadie vio los datos.</p>
            ) : (
              <ListaVecinos vecinos={emergencia.vieronDatos} conFecha />
            )}

            {emergencia.reportados.some((v) => v.vio_datos_en === null) ? (
              <>
                <h4 className="mt-3 text-sm font-semibold">Reportados</h4>
                <ListaVecinos vecinos={emergencia.reportados.filter((v) => v.vio_datos_en === null)} conFecha={false} />
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
