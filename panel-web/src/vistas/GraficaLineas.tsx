/**
 * Vista. Línea en SVG, sin librerías.
 * Solo pinta los valores que recibe. Si no hay registros, o todos son cero, dice «Sin datos».
 */
import { useEffect, useId, useRef, useState } from "react";

export interface PuntoLinea {
  etiqueta: string;
  valor: number | null;
}

const ALTO = 300;
const MARGEN_SUP = 40;
const MARGEN_INF = 44;
const AZUL = "#1F4E9C";
const GUIAS = 4;

function esNumero(valor: number | null | undefined): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

export function GraficaLineas({ titulo, datos }: { titulo: string; datos: PuntoLinea[] | null | undefined }) {
  const caja = useRef<HTMLDivElement>(null);
  const degradadoId = `area-${useId().replaceAll(":", "")}`;
  const [ancho, setAncho] = useState(640);
  const lista = datos ?? [];
  const vacia = lista.length === 0 || lista.every((punto) => !esNumero(punto?.valor) || punto.valor === 0);
  const resumen = vacia
    ? `${titulo}. Sin datos`
    : `${titulo}. ${lista
        .filter((punto) => esNumero(punto?.valor))
        .map((punto) => `${punto.etiqueta}: ${punto.valor}`)
        .join(", ")}`;

  useEffect(() => {
    const elemento = caja.current;
    if (!elemento) return;
    const observar = new ResizeObserver((entradas) => {
      const medida = entradas[0]?.contentRect.width ?? 0;
      if (medida > 0) setAncho(Math.floor(medida));
    });
    observar.observe(elemento);
    return () => observar.disconnect();
  }, []);

  if (vacia) {
    return (
      <p role="img" aria-label={resumen} className="mt-4 text-base text-stone-600">
        Sin datos
      </p>
    );
  }

  const numeros = lista.map((punto) => (esNumero(punto?.valor) ? punto.valor : 0));
  const maximo = Math.max(...numeros, 1) * 1.25;
  const zonaAlto = ALTO - MARGEN_SUP - MARGEN_INF;
  const baseY = MARGEN_SUP + zonaAlto;
  const hueco = ancho / lista.length;
  const puntos = lista.map((punto, indice) => {
    const valor = esNumero(punto?.valor) ? punto.valor : null;
    const x = indice * hueco + hueco / 2;
    const y = valor === null ? baseY : baseY - (valor / maximo) * zonaAlto;
    return { etiqueta: punto?.etiqueta ?? "", valor, x, y };
  });

  const segmentos: { x: number; y: number }[][] = [];
  let segmento: { x: number; y: number }[] = [];
  for (const punto of puntos) {
    if (punto.valor === null) {
      if (segmento.length > 0) segmentos.push(segmento);
      segmento = [];
      continue;
    }
    segmento.push({ x: punto.x, y: punto.y });
  }
  if (segmento.length > 0) segmentos.push(segmento);

  const areaDe = (tramo: { x: number; y: number }[]) => {
    const primero = tramo[0];
    const ultimo = tramo[tramo.length - 1];
    if (!primero || !ultimo) return "";
    const linea = tramo.map((punto, indice) => `${indice === 0 ? "M" : "L"} ${punto.x} ${punto.y}`).join(" ");
    return `${linea} L ${ultimo.x} ${baseY} L ${primero.x} ${baseY} Z`;
  };

  return (
    <div ref={caja} className="mt-4 w-full">
      <svg role="img" aria-label={resumen} viewBox={`0 0 ${ancho} ${ALTO}`} className="h-[300px] w-full">
        <defs>
          <linearGradient id={degradadoId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AZUL} stopOpacity={0.25} />
            <stop offset="100%" stopColor={AZUL} stopOpacity={0} />
          </linearGradient>
        </defs>
        {Array.from({ length: GUIAS }, (_, indice) => {
          const y = baseY - ((indice + 1) / GUIAS) * zonaAlto;
          return <line key={y} x1={0} y1={y} x2={ancho} y2={y} stroke="#E2E8F0" strokeWidth={1} />;
        })}
        <line x1={0} y1={baseY} x2={ancho} y2={baseY} stroke="#E2E8F0" strokeWidth={1} />
        {segmentos.map((tramo) => (
          <path key={areaDe(tramo)} d={areaDe(tramo)} fill={`url(#${degradadoId})`} />
        ))}
        {segmentos.map((tramo) => (
          <polyline
            key={tramo.map((punto) => `${punto.x},${punto.y}`).join(" ")}
            points={tramo.map((punto) => `${punto.x},${punto.y}`).join(" ")}
            fill="none"
            stroke={AZUL}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {puntos.map((punto) => (
          <g key={`${punto.etiqueta}-${punto.x}`}>
            {punto.valor !== null ? (
              <>
                <text x={punto.x} y={punto.y - 16} textAnchor="middle" fontSize={14} fill="#1c1917">
                  {punto.valor}
                </text>
                <circle cx={punto.x} cy={punto.y} r={5} fill={AZUL} stroke="white" strokeWidth={2} />
              </>
            ) : null}
            <text x={punto.x} y={baseY + 24} textAnchor="middle" fontSize={14} fill="#44403c">
              {punto.etiqueta}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
