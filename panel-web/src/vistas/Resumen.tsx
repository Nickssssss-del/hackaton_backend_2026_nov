/**
 * Vista. Totales del día. No muestra personas, teléfonos ni ubicaciones.
 */
import { useResumen } from "../controladores/useResumen";
import type { ResumenDia } from "../modelos/resumen";
import { Mensajes } from "./Mensajes";

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
      <h2 id="titulo-resumen" className="text-xl font-bold">
        Resumen del día
      </h2>
      <p className="mt-1 text-stone-700">Hoy en Lima: {HOY.format(new Date())}. Solo totales.</p>

      <Mensajes cargando={cargando} error={error} aviso={null} onRecargar={() => void recargar()} />

      {resumen ? (
        <dl className="mt-6 space-y-3">
          {FILAS.map((fila) => (
            <div key={fila.clave} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-semibold">{fila.titulo}</dt>
                <dd className="text-2xl font-bold tabular-nums">{resumen[fila.clave]}</dd>
              </div>
              <p className="mt-1 text-sm text-stone-600">{fila.detalle}</p>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
