/**
 * Vista. Totales del día. No muestra personas, teléfonos ni ubicaciones.
 */
import { useResumen } from "../controladores/useResumen";
import type { ResumenDia } from "../modelos/resumen";
import { Cargando } from "./Cargando";
import { Mensajes } from "./Mensajes";
import { TiempoUsoResumen } from "./TiempoUsoResumen";

const HOY = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "America/Lima" });

const FILAS: { clave: keyof ResumenDia; titulo: string; detalle: string }[] = [
  { clave: "negociosVisibles", titulo: "Negocios visibles", detalle: "No ocultos y visibles para los vecinos." },
  { clave: "pedidosAbiertos", titulo: "Pedidos abiertos", detalle: "Estado abierto y sin vencer." },
  { clave: "emergenciasReales", titulo: "Emergencias reales", detalle: "Creadas hoy, sin las de práctica." },
  {
    clave: "reportesPendientes",
    titulo: "Reportes pendientes",
    detalle: "Los que aún cuentan: posteriores a la última revisión, más los reportes a personas.",
  },
  { clave: "avisosInicio", titulo: "Avisos de inicio", detalle: "Push de hoy, con avisado_en." },
  { clave: "avisosCierre", titulo: "Avisos de cierre", detalle: "Push de hoy, con cierre_avisado_en." },
];

export function Resumen() {
  const { resumen, cargando, error, recargar } = useResumen();

  return (
    <section aria-labelledby="titulo-resumen">
      <h2 id="titulo-resumen" className="text-3xl font-bold text-stone-900">
        Resumen del día
      </h2>
      <p className="mt-1 text-base text-stone-600">Hoy en Lima: {HOY.format(new Date())}. Solo totales.</p>

      {cargando ? <Cargando /> : null}
      <Mensajes cargando={false} error={error} aviso={null} onRecargar={() => void recargar()} />

      {resumen ? (
        <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FILAS.map((fila) => (
            <div key={fila.clave} className="rounded-2xl border border-stone-200 bg-white p-4">
              <dt className="text-base font-semibold text-stone-900">{fila.titulo}</dt>
              <dd className="mt-2 text-3xl font-bold tabular-nums text-stone-900">{resumen[fila.clave]}</dd>
              <p className="mt-2 text-base text-stone-600">{fila.detalle}</p>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-8">
        <TiempoUsoResumen />
      </div>
    </section>
  );
}
