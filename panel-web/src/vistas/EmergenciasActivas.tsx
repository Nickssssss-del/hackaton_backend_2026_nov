/**
 * Vista. Emergencias activas con su cadena y los vecinos que van. Solo lectura, en tiempo real.
 * No muestra nombre, dirección ni coordenadas.
 */
import { useEmergenciasActivas } from "../controladores/useEmergenciasActivas";
import { estadoEslabon, hora, venceEn } from "./etiquetas";
import { Mensajes } from "./Mensajes";

function Conexion({ enVivo }: { enVivo: boolean | null }) {
  const [texto, punto] =
    enVivo === null
      ? ["Conectando…", "bg-stone-400"]
      : enVivo
        ? ["En vivo", "bg-emerald-600"]
        : ["Sin conexión en vivo · se recarga cada 15 s", "bg-amber-600"];
  return (
    <p className="mt-2 flex items-center gap-2 text-sm text-stone-700" role="status">
      <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-full ${punto}`} />
      {texto}
    </p>
  );
}

function Etiqueta({ children, tono }: { children: string; tono: "ambar" | "gris" }) {
  const clases = tono === "ambar" ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-800";
  return <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${clases}`}>{children}</span>;
}

export function EmergenciasActivas() {
  const { emergencias, cargando, error, enVivo, ahora, recargar } = useEmergenciasActivas();

  return (
    <section aria-labelledby="titulo-emergencias">
      <h2 id="titulo-emergencias" className="text-xl font-bold">
        Emergencias activas
      </h2>
      <p className="mt-1 text-stone-700">Solo lectura. Muestra la cadena de llamadas y cuántos vecinos van.</p>
      <Conexion enVivo={enVivo} />

      <Mensajes cargando={cargando} error={error} aviso={null} onRecargar={recargar} />

      {!cargando && !error && emergencias.length === 0 ? (
        <p className="mt-6 rounded-xl bg-stone-100 p-4">No hay emergencias activas.</p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {emergencias.map((emergencia) => (
          <li key={emergencia.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">Emergencia de las {hora(emergencia.creado_en)}</h3>
                <p className="text-sm text-stone-600">{venceEn(emergencia.expira_en, ahora)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {emergencia.practica ? <Etiqueta tono="ambar">Práctica</Etiqueta> : null}
                <Etiqueta tono="gris">{emergencia.avisar_vecinos ? "Avisa a vecinos" : "Solo contactos"}</Etiqueta>
              </div>
            </div>

            <p className="mt-3 font-medium">
              {emergencia.vecinos_van} {emergencia.vecinos_van === 1 ? "vecino va" : "vecinos van"}
            </p>

            <h4 className="mt-3 text-sm font-semibold">Cadena de llamadas</h4>
            {emergencia.eslabones.length === 0 ? (
              <p className="text-sm text-stone-600">Todavía no hay llamadas.</p>
            ) : (
              <ol className="mt-1 space-y-1 text-sm">
                {emergencia.eslabones.map((eslabon) => (
                  <li key={eslabon.orden} className="flex justify-between gap-3">
                    <span>
                      {eslabon.orden}. {eslabon.contacto ?? "Sin nombre"}
                    </span>
                    <span className="font-medium">{estadoEslabon(eslabon.estado)}</span>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
