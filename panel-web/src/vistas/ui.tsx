/**
 * Vista. Piezas de interfaz compartidas: íconos, logo, etiquetas, avisos, botones,
 * encabezado de pantalla y tabla. Siguen el mockup «Vecinos · Panel administrativo».
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { usePanel } from "./contexto";

/* ------------------------------------------------------------------ Íconos */

const TRAZOS = {
  casa: "M3 10.5 12 3l9 7.5M5 9v11h14V9",
  alerta: "M12 3 2 20h20L12 3zM12 10v4M12 17h.01",
  reloj: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  tienda: "M4 9h16M5 9V20h14V9M4 9l1.5-5h13L20 9M10 20v-5h4v5",
  mensaje: "M4 5h16v11H9l-5 4V5z",
  prohibido: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8",
  campana: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 21h4",
  corazon: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  ojo: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  basura: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  derecha: "M9 6l6 6-6 6",
  abajo: "M6 9l6 6 6-6",
  arriba: "M6 15l6-6 6 6",
  salir: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10",
  usuario: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  caminante:
    "M13 4.5a1.5 1.5 0 1 0 0-.01M10 21l2-6 3 3v3M9 12l2-4 4 1 2 3M11 8l-2 6M15 9l-1 6",
  recargar: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  menu: "M4 6h16M4 12h16M4 18h16",
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, className = "h-5 w-5" }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

/**
 * Logo de Kuna (public/logo-kuna.svg). Se usa como máscara para que tome
 * el color del texto: blanco sobre el azul del acceso, azul en la barra lateral.
 */
export function Logo({ className = "h-11 w-11" }: { className?: string }) {
  const mascara = "url(/logo-kuna.svg) center / contain no-repeat";
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ mask: mascara, WebkitMask: mascara }}
    />
  );
}

/* --------------------------------------------------------------- Etiquetas */

export type Tono = "rojo" | "verde" | "ambar" | "gris" | "azul" | "morado" | "naranja";

const TONOS: Record<Tono, string> = {
  rojo: "bg-rojo-suave text-rojo",
  verde: "bg-verde-suave text-verde",
  ambar: "bg-ambar-suave text-ambar",
  gris: "bg-gris-suave text-tinta-2",
  azul: "bg-marca-suave text-marca",
  morado: "bg-morado-suave text-morado",
  naranja: "bg-naranja-suave text-naranja",
};

export function Pill({ tono, children }: { tono: Tono; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[13px] font-semibold ${TONOS[tono]}`}>
      {children}
    </span>
  );
}

/** Cuadro de ícono de color, como en las tarjetas del resumen. */
export function IconoTonal({ nombre, tono, className = "h-11 w-11" }: { nombre: NombreIcono; tono: Tono; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-xl ${TONOS[tono]} ${className}`}>
      <Icono nombre={nombre} />
    </span>
  );
}

/* ------------------------------------------------------------------ Avisos */

const AVISOS = {
  azul: "bg-marca-suave text-marca",
  ambar: "bg-ambar-suave text-ambar",
  verde: "bg-verde-suave text-verde",
};

export function Aviso({ tono = "azul", children }: { tono?: keyof typeof AVISOS; children: ReactNode }) {
  return (
    <p className={`flex items-start gap-3 rounded-xl px-4 py-3 text-[15px] ${AVISOS[tono]}`}>
      <Icono nombre="info" className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Carga, error con «Recargar» y confirmación de la última acción. */
export function Estado({
  cargando,
  error,
  aviso,
  onRecargar,
}: {
  cargando: boolean;
  error: string | null;
  aviso?: string | null;
  onRecargar: () => void;
}) {
  return (
    <div aria-live="polite" className="empty:hidden space-y-2">
      {cargando ? <p className="text-tinta-3">Cargando…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rojo-suave px-4 py-3 text-rojo">
          <p>{error}</p>
          <button type="button" onClick={onRecargar} className="inline-flex items-center gap-1.5 font-semibold underline">
            <Icono nombre="recargar" className="h-4 w-4" />
            Recargar
          </button>
        </div>
      ) : null}
      {aviso ? <p className="rounded-xl bg-verde-suave px-4 py-3 font-medium text-verde">{aviso}</p> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- Botones */

type Variante = "mostrar" | "borrar" | "primario" | "secundario" | "bloquear" | "desbloquear";

const VARIANTES: Record<Variante, string> = {
  mostrar: "border border-verde text-verde hover:bg-verde-suave",
  borrar: "border border-rojo text-rojo hover:bg-rojo-suave",
  primario: "bg-marca text-white hover:bg-marca-oscuro",
  secundario: "border border-borde-fuerte bg-superficie text-tinta hover:bg-fondo",
  bloquear: "bg-gris-suave text-tinta hover:bg-borde",
  desbloquear: "border border-verde text-verde hover:bg-verde-suave",
};

export function Boton({
  variante,
  icono,
  children,
  className = "",
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante: Variante; icono?: NombreIcono }) {
  return (
    <button
      type="button"
      {...resto}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-titulo text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${className}`}
    >
      {icono ? <Icono nombre={icono} className="h-[18px] w-[18px]" /> : null}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- Encabezado */

export function Encabezado({ titulo, subtitulo, extra }: { titulo: string; subtitulo: string; extra?: ReactNode }) {
  const { zona, zonas, fijarZona } = usePanel();
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-borde bg-superficie px-4 py-4 sm:px-10 sm:py-5">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{titulo}</h1>
        <p className="mt-0.5 text-[15px] text-tinta-2">{subtitulo}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {extra}
        <label className="flex items-center gap-3 font-titulo font-semibold">
          Zona
          <select
            value={zona}
            onChange={(e) => fijarZona(e.target.value)}
            className="h-11 min-w-44 rounded-xl border border-borde-fuerte bg-superficie px-3 font-sans font-semibold text-tinta"
          >
            <option value="">Todas</option>
            {zonas.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}

/** Contenido de una pantalla con su margen. */
export function Cuerpo({ children }: { children: ReactNode }) {
  return <div className="space-y-6 px-4 py-6 sm:px-10 sm:py-8">{children}</div>;
}

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-borde bg-superficie ${className}`}>{children}</section>;
}

/* ------------------------------------------------------------------- Tabla */

export function Tabla({ columnas, children, etiqueta }: { columnas: string[]; children: ReactNode; etiqueta: string }) {
  return (
    <Tarjeta className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left" aria-label={etiqueta}>
        <thead>
          <tr className="border-b border-borde">
            {columnas.map((c) => (
              <th
                key={c}
                scope="col"
                className="whitespace-nowrap px-4 py-3.5 font-titulo text-[13px] font-semibold uppercase tracking-wider text-tinta-2"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">{children}</tbody>
      </table>
    </Tarjeta>
  );
}

export function Celda({ children, className = "", colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`px-4 py-4 align-top ${className}`}>
      {children}
    </td>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-borde-fuerte bg-superficie px-5 py-8 text-center text-tinta-2">{children}</p>;
}
