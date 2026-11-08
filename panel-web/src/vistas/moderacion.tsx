/**
 * Vista. Piezas de las pantallas de moderación: motivos agrupados, «Ver reportes»,
 * botones Mostrar/Borrar y el selector de motivo para bloquear.
 */
import { useId, useState, type ReactNode } from "react";
import { cuando, MOTIVOS_BLOQUEO } from "./etiquetas";
import { Boton, Icono, Pill } from "./ui";

interface Reporte {
  id: string;
  motivo: string;
  creado_en: string;
}

/** «Datos falsos · 3»: un motivo por línea, con cuántas veces se reportó. */
export function Motivos({ reportes, etiqueta }: { reportes: Reporte[]; etiqueta: (m: string) => string }) {
  const conteo = new Map<string, number>();
  for (const r of reportes) conteo.set(r.motivo, (conteo.get(r.motivo) ?? 0) + 1);
  if (conteo.size === 0) return <span className="text-sm text-tinta-2">Lo ocultó un admin</span>;
  return (
    <span className="flex flex-col items-start gap-1.5">
      {[...conteo.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([motivo, n]) => (
          <Pill key={motivo} tono="rojo">
            {etiqueta(motivo)} · {n}
          </Pill>
        ))}
    </span>
  );
}

/** Desde cuándo está oculto: el último reporte (el que lo ocultó), o la fecha de creación. */
export function ocultoDesde(reportes: Reporte[], creadoEn: string): string {
  return reportes[0]?.creado_en ?? creadoEn;
}

type AccionesProps = {
  nombre: string;
  ocupado: boolean;
  guardando: boolean;
  abierto: boolean;
  onMostrar: () => void;
  onBorrar: () => void;
  onVerReportes: () => void;
};

export function Acciones({ nombre, ocupado, guardando, abierto, onMostrar, onBorrar, onVerReportes }: AccionesProps) {
  return (
    <div>
      <div className="flex flex-nowrap gap-2.5">
        <Boton variante="mostrar" icono="ojo" disabled={ocupado} onClick={onMostrar} aria-label={`Mostrar ${nombre}`}>
          {guardando ? "Guardando…" : "Mostrar"}
        </Boton>
        <Boton variante="borrar" icono="basura" disabled={ocupado} onClick={onBorrar} aria-label={`Borrar ${nombre}`}>
          Borrar
        </Boton>
      </div>
      <button
        type="button"
        onClick={onVerReportes}
        aria-expanded={abierto}
        className="mt-3 inline-flex items-center gap-1 font-titulo text-sm font-semibold text-marca hover:underline"
      >
        {abierto ? "Ocultar reportes" : "Ver reportes"}
        <Icono nombre={abierto ? "arriba" : "abajo"} className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Lista de reportes con fecha; marca los anteriores a la última revisión. */
export function DetalleReportes({
  reportes,
  revisadoEn,
  etiqueta,
  children,
}: {
  reportes: Reporte[];
  revisadoEn: string | null;
  etiqueta: (m: string) => string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-fondo px-5 py-4">
      {reportes.length === 0 ? (
        <p className="text-sm text-tinta-2">Sin reportes: lo ocultó un admin.</p>
      ) : (
        <ul className="grid gap-x-8 gap-y-1.5 text-[15px] sm:grid-cols-2">
          {reportes.map((r, i) => {
            const previo = revisadoEn !== null && Date.parse(r.creado_en) <= Date.parse(revisadoEn);
            return (
              <li key={r.id} className="flex justify-between gap-3">
                <span>
                  Reporte {reportes.length - i}: <strong className="font-semibold">{etiqueta(r.motivo)}</strong>
                  {previo ? <span className="text-tinta-3"> (antes de la última revisión)</span> : null}
                </span>
                <span className="shrink-0 text-tinta-2">{cuando(r.creado_en)}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-sm text-tinta-3">Por privacidad no se muestra quién reportó.</p>
      {children}
    </div>
  );
}

/** Selector «Motivo del bloqueo» + botón Bloquear (deshabilitado hasta elegir). */
export function SelectorBloqueo({
  persona,
  ocupado,
  guardando,
  onBloquear,
  compacto = false,
}: {
  persona: string;
  ocupado: boolean;
  guardando: boolean;
  onBloquear: (motivo: string) => void;
  compacto?: boolean;
}) {
  const id = useId();
  const [motivo, setMotivo] = useState("");
  return (
    <div className={`flex flex-wrap items-end gap-3 ${compacto ? "" : "min-w-[15rem]"}`}>
      <label htmlFor={id} className="block">
        <span className="block font-titulo text-[12px] font-semibold uppercase tracking-wider text-tinta-2">
          Motivo del bloqueo
        </span>
        <select
          id={id}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className={`mt-1.5 h-11 w-60 rounded-xl border bg-superficie px-3 ${motivo ? "border-borde-fuerte" : "border-[#e5b94a]"}`}
        >
          <option value="">Elegir…</option>
          {MOTIVOS_BLOQUEO.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <Boton
        variante={motivo ? "primario" : "bloquear"}
        icono="prohibido"
        disabled={ocupado || !motivo}
        onClick={() => {
          if (window.confirm(`¿Bloquear a ${persona}? No podrá publicar, comentar ni reportar.`)) onBloquear(motivo);
        }}
        aria-label={`Bloquear a ${persona}`}
        className="h-11"
      >
        {guardando ? "Bloqueando…" : "Bloquear"}
      </Boton>
    </div>
  );
}
