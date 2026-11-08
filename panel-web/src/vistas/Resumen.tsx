/**
 * Vista. «Resumen del día»: totales por zona, uso de la app y lo que espera revisión.
 * Solo cuenta: no identifica a nadie.
 */
import { useState } from "react";
import { useResumen } from "../controladores/useResumen";
import { usePanel, type IdPantalla } from "./contexto";
import { fechaLarga, ultimosSieteDias } from "./etiquetas";
import { Aviso, Cuerpo, Encabezado, Estado, Icono, IconoTonal, Tarjeta, type NombreIcono, type Tono } from "./ui";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function Resumen() {
  const { zona } = usePanel();
  const { resumen, cargando, error, recargar } = useResumen(zona);

  return (
    <>
      <Encabezado
        titulo="Resumen del día"
        subtitulo={`${fechaLarga(new Date().toISOString())} · totales por zona, sin identificar a nadie`}
      />
      <Cuerpo>
        <Estado cargando={cargando && !resumen} error={error} onRecargar={recargar} />
        {resumen ? (
          <>
            <Totales {...resumen} />
            <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
              <UsoDeLaApp uso={resumen.uso} />
              <PorRevisar />
            </div>
          </>
        ) : null}
      </Cuerpo>
    </>
  );
}

function Totales(r: NonNullable<ReturnType<typeof useResumen>["resumen"]>) {
  const { pendientes, zona } = usePanel();
  const reportes = pendientes.servicios + pendientes.publicaciones + pendientes.comentarios + pendientes.personas;
  const tarjetas: { icono: NombreIcono; tono: Tono; valor: number; titulo: string; detalle: string }[] = [
    { icono: "tienda", tono: "naranja", valor: r.negocios, titulo: "Negocios visibles", detalle: zona ? `En ${zona}` : "En todas las zonas" },
    { icono: "corazon", tono: "azul", valor: r.pedidos, titulo: "Pedidos abiertos", detalle: "Vencen a las 48 h" },
    {
      icono: "alerta",
      tono: "rojo",
      valor: r.emergenciasReales,
      titulo: "Emergencias reales hoy",
      detalle: `+ ${plural(r.emergenciasPractica, "de práctica", "de práctica")}`,
    },
    {
      icono: "prohibido",
      tono: "morado",
      valor: reportes,
      titulo: "Reportes pendientes",
      detalle: `${plural(pendientes.servicios, "servicio", "servicios")} · ${pendientes.publicaciones + pendientes.comentarios} comunidad · ${plural(pendientes.personas, "persona", "personas")}`,
    },
    {
      icono: "campana",
      tono: "verde",
      valor: r.avisosInicio + r.avisosCierre,
      titulo: "Avisos push enviados",
      detalle: `${r.avisosInicio} al iniciar · ${r.avisosCierre} al cerrar`,
    },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {tarjetas.map((t) => (
        <li key={t.titulo} className="rounded-2xl border border-borde bg-superficie p-5">
          <IconoTonal nombre={t.icono} tono={t.tono} />
          <p className="mt-3 font-titulo text-4xl font-bold">{t.valor}</p>
          <p className="mt-2 font-titulo text-[17px] font-semibold leading-snug">{t.titulo}</p>
          <p className="mt-0.5 text-[15px] text-tinta-2">{t.detalle}</p>
        </li>
      ))}
    </ul>
  );
}

function UsoDeLaApp({ uso }: { uso: { aperturas: number[]; segundosHoy: number } | null }) {
  const [verTabla, setVerTabla] = useState(false);
  const dias = ultimosSieteDias();

  if (!uso) {
    return (
      <Tarjeta className="p-6">
        <h2 className="text-xl font-semibold">Uso de la app</h2>
        <p className="mt-4 text-tinta-2">
          La base todavía no registra las aperturas de la app. Cuando exista, aquí se verán las aperturas por día y los
          minutos de uso.
        </p>
        <div className="mt-6">
          <Aviso tono="verde">Solo se guardarán zona, día y segundos. Nunca quién usó la app. Se borra a los 7 días.</Aviso>
        </div>
      </Tarjeta>
    );
  }

  const hoy = uso.aperturas[6] ?? 0;
  const minutos = Math.round(uso.segundosHoy / 60);
  const promedio = hoy > 0 ? (Math.round((uso.segundosHoy / 60 / hoy) * 10) / 10).toString().replace(".", ",") : "0";

  return (
    <Tarjeta className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Uso de la app</h2>
        <button type="button" onClick={() => setVerTabla((v) => !v)} className="text-sm text-tinta-2 underline-offset-2 hover:underline">
          Aperturas por día · últimos 7 días{verTabla ? " (ver gráfico)" : " (ver tabla)"}
        </button>
      </div>
      <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        {[
          [hoy.toLocaleString("es-PE"), "Aperturas hoy"],
          [`${minutos.toLocaleString("es-PE")} min`, "Minutos totales"],
          [`${promedio} min`, "Promedio por apertura"],
        ].map(([valor, texto]) => (
          <div key={texto}>
            <dt className="sr-only">{texto}</dt>
            <dd className="font-titulo text-[32px] font-bold leading-none">{valor}</dd>
            <dd className="mt-1.5 text-[15px] text-tinta-2">{texto}</dd>
          </div>
        ))}
      </dl>

      {verTabla ? (
        <table className="mt-6 w-full text-left">
          <caption className="sr-only">Aperturas por día, últimos 7 días</caption>
          <thead>
            <tr className="border-b border-borde text-sm text-tinta-2">
              <th className="py-2 font-semibold">Día</th>
              <th className="py-2 text-right font-semibold">Aperturas</th>
            </tr>
          </thead>
          <tbody>
            {uso.aperturas.map((n, i) => (
              <tr key={dias[i]} className="border-b border-borde last:border-0">
                <td className="py-2">{dias[i]}</td>
                <td className="py-2 text-right font-semibold tabular-nums">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Barras valores={uso.aperturas} dias={dias} />
      )}

      <div className="mt-5">
        <Aviso tono="verde">Solo se guardan zona, día y segundos. Nunca quién usó la app. Se borra a los 7 días.</Aviso>
      </div>
    </Tarjeta>
  );
}

/** Barras de aperturas por día. Una sola serie: «Hoy» va en el tono fuerte. */
function Barras({ valores, dias }: { valores: number[]; dias: string[] }) {
  const max = Math.max(1, ...valores);
  const [encima, setEncima] = useState<number | null>(null);
  return (
    <div className="mt-6" role="img" aria-label={`Aperturas por día: ${valores.map((v, i) => `${dias[i]} ${v}`).join(", ")}`}>
      <div className="flex h-48 items-end gap-3 border-b-2 border-borde px-2 sm:gap-5">
        {valores.map((v, i) => {
          const hoy = i === valores.length - 1;
          return (
            <div
              key={dias[i]}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setEncima(i)}
              onMouseLeave={() => setEncima(null)}
            >
              {encima === i ? (
                <span className="absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-lg bg-tinta px-2.5 py-1 text-xs font-semibold text-white shadow">
                  {dias[i]}: {v} aperturas
                </span>
              ) : null}
              <span className="mb-1 font-titulo text-[13px] font-semibold tabular-nums">{v}</span>
              <span
                className={`w-full max-w-12 rounded-t-[4px] transition-colors ${
                  hoy ? "bg-marca" : encima === i ? "bg-[#8eabe0]" : "bg-marca-barra"
                }`}
                style={{ height: `${(v / max) * 82}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 px-2 pt-2 sm:gap-5">
        {dias.map((d, i) => (
          <span key={d + i} className={`flex-1 text-center text-sm ${i === dias.length - 1 ? "font-semibold text-tinta" : "text-tinta-2"}`}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

function PorRevisar() {
  const { pendientes, irA } = usePanel();
  // Las de práctica no piden atención: solo se cuentan si no hay reales.
  const reales = pendientes.emergencias.filter((e) => !e.practica);
  const listaEmergencias = reales.length > 0 ? reales : pendientes.emergencias;
  const emergencia = listaEmergencias[0];
  const comunidad = pendientes.publicaciones + pendientes.comentarios;

  const filas: { id: IdPantalla; icono: NombreIcono; tono: Tono; titulo: string; detalle: string; n: number }[] = [
    {
      id: "activas",
      icono: "alerta",
      tono: "rojo",
      n: listaEmergencias.length,
      titulo:
        reales.length > 0
          ? plural(reales.length, "emergencia activa", "emergencias activas")
          : plural(listaEmergencias.length, "emergencia de práctica", "emergencias de práctica"),
      detalle: emergencia ? `${emergencia.codigo}${emergencia.zona ? ` · ${emergencia.zona}` : ""}` : "",
    },
    {
      id: "servicios",
      icono: "tienda",
      tono: "naranja",
      n: pendientes.servicios,
      titulo: plural(pendientes.servicios, "servicio oculto", "servicios ocultos"),
      detalle: "Por reportes de vecinos",
    },
    {
      id: "comunidad",
      icono: "mensaje",
      tono: "morado",
      n: comunidad,
      titulo: `${comunidad} en comunidad`,
      detalle: `${plural(pendientes.publicaciones, "publicación", "publicaciones")} · ${plural(pendientes.comentarios, "comentario", "comentarios")}`,
    },
    {
      id: "bloqueos",
      icono: "prohibido",
      tono: "gris",
      n: pendientes.personas,
      titulo: plural(pendientes.personas, "persona reportada", "personas reportadas"),
      detalle: "Decidir bloquear o descartar",
    },
  ];
  const visibles = filas.filter((f) => f.n > 0);

  return (
    <Tarjeta className="p-6">
      <h2 className="text-xl font-semibold">Por revisar</h2>
      {visibles.length === 0 ? (
        <p className="mt-4 rounded-xl bg-verde-suave px-4 py-3 font-medium text-verde">Todo al día: no hay nada por revisar.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visibles.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => irA(f.id)}
                className="flex w-full items-center gap-4 rounded-xl border border-borde px-4 py-3.5 text-left transition-colors hover:border-marca-barra hover:bg-marca-suave/40"
              >
                <IconoTonal nombre={f.icono} tono={f.tono} className="h-10 w-10" />
                <span className="min-w-0 flex-1">
                  <span className="block font-titulo text-[16px] font-semibold">{f.titulo}</span>
                  <span className="block truncate text-[15px] text-tinta-2">{f.detalle}</span>
                </span>
                <Icono nombre="derecha" className="h-5 w-5 shrink-0 text-marca" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
