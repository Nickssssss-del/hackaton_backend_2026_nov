/**
 * Vista. Tiempo de uso de los últimos 7 días, para la pantalla Resumen.
 * Sin datos de quién: aperturas y minutos, por zona solo si hay 5 o más aperturas.
 */
import { useTiempoUso } from "../controladores/useTiempoUso";
import { MINIMO_POR_ZONA } from "../modelos/tiempoUso";
import { Mensajes } from "./Mensajes";

// fecha es "YYYY-MM-DD" (día de Lima): se lee como UTC para que no se corra un día.
const formatoDia = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dia = (fecha: string) => formatoDia.format(new Date(`${fecha}T00:00:00Z`));
const franja = (hora: number) => `${String(hora).padStart(2, "0")}:00 a ${String((hora + 1) % 24).padStart(2, "0")}:00`;
const numero = new Intl.NumberFormat("es-PE");

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <dt className="text-sm text-stone-600">{etiqueta}</dt>
      <dd className="mt-1 text-xl font-semibold">{valor}</dd>
    </div>
  );
}

export function TiempoUsoResumen() {
  const { resumen, cargando, error, recargar } = useTiempoUso();
  const vacio = !cargando && !error && resumen !== null && resumen.aperturas === 0;

  return (
    <section aria-labelledby="titulo-tiempo-uso">
      <h3 id="titulo-tiempo-uso" className="text-lg font-semibold">
        Tiempo de uso
      </h3>
      <p className="mt-1 text-sm text-stone-700">Últimos 7 días. No se guarda quién usó la app.</p>

      <Mensajes cargando={cargando} error={error} aviso={null} onRecargar={() => void recargar()} />

      {vacio ? <p className="mt-4 rounded-xl bg-stone-100 p-4">Todavía no hay datos de uso</p> : null}

      {resumen && resumen.aperturas > 0 && !error ? (
        <>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Dato etiqueta="Aperturas" valor={numero.format(resumen.aperturas)} />
            <Dato etiqueta="Minutos en total" valor={numero.format(resumen.minutosTotales)} />
            <Dato etiqueta="Minutos por apertura" valor={numero.format(resumen.minutosPorApertura)} />
            {resumen.diaPico ? <Dato etiqueta="Día con más aperturas" valor={dia(resumen.diaPico)} /> : null}
            {resumen.horaPico !== null ? (
              <Dato etiqueta="Hora con más aperturas" valor={franja(resumen.horaPico)} />
            ) : null}
          </dl>

          <h4 className="mt-6 text-sm font-semibold">Por zona</h4>
          <p className="text-sm text-stone-600">
            Solo zonas con {MINIMO_POR_ZONA} o más aperturas; el resto se suma en «Otras zonas».
          </p>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-stone-600">
              <tr>
                <th scope="col" className="py-1 font-medium">Zona</th>
                <th scope="col" className="py-1 text-right font-medium">Aperturas</th>
                <th scope="col" className="py-1 text-right font-medium">Minutos</th>
              </tr>
            </thead>
            <tbody>
              {resumen.zonas.map((zona) => (
                <tr key={zona.nombre} className="border-t border-stone-200">
                  <th scope="row" className="py-1.5 font-normal">{zona.nombre}</th>
                  <td className="py-1.5 text-right">{numero.format(zona.aperturas)}</td>
                  <td className="py-1.5 text-right">{numero.format(zona.minutos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
