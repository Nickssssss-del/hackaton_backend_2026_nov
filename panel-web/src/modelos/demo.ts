/**
 * Modelo. Datos de ejemplo en memoria para el modo demo.
 * Las acciones (mostrar, borrar, bloquear…) cambian estos datos hasta recargar la página.
 * Ningún dato real: nombres y negocios inventados.
 */
import type { Bloqueo, ReportePersona } from "./bloqueos";
import type { ComentarioOculto, PublicacionOculta } from "./comunidadOculta";
import type { EmergenciaActiva, EmergenciaCerrada } from "./emergencias";
import type { GrupoApoyo } from "./grupos";
import type { ServicioOculto } from "./serviciosOcultos";
import type { Zona } from "./zonas";

const SF = "Urb. San Francisco";
const AQ = "Los Aquijes";
const TG = "La Tinguiña";

export const DEMO_ADMIN_ID = "d3m0-ad41-0000-0000-00000000a001";
export const DEMO_CORREO = "admin@ctrlfuture.pe";

/** Fecha ISO de hace `min` minutos. */
const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

/** Fecha ISO de hace `dias` días a la hora indicada (hora local). */
function diaHora(dias: number, h: number, m: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** Hoy a la hora indicada, o hace `respaldoMin` minutos si esa hora aún no llega. */
function hoyA(h: number, m: number, respaldoMin: number): string {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime() < Date.now() ? d.toISOString() : hace(respaldoMin);
}

const reportes = (motivo: string, n: number, desde: string) =>
  Array.from({ length: n }, (_, i) => ({
    id: `r-${motivo}-${desde}-${i}`,
    motivo,
    creado_en: new Date(Date.parse(desde) - i * 37 * 60_000).toISOString(),
  }));

function crearEstado() {
  const ocultoBodega = hoyA(10, 15, 50);
  const ocultoGasfitero = diaHora(1, 19, 40);
  const ocultoCelulares = hoyA(8, 30, 120);
  const ocultoMoto = diaHora(1, 21, 5);
  const ocultoComentario = diaHora(1, 16, 20);

  const servicios: ServicioOculto[] = [
    {
      id: "s-bodega",
      nombre_negocio: "Bodega El Ahorro",
      oficio: "bodega",
      descripcion: "Abarrotes y bebidas, delivery en la urbanización.",
      zona: SF,
      creado_en: diaHora(40, 9, 0),
      revisado_en: null,
      reportes: reportes("datos_falsos", 3, ocultoBodega),
    },
    {
      id: "s-gasfitero",
      nombre_negocio: "Gasfitero 24 h",
      oficio: "oficios",
      descripcion: "Gasfitería a domicilio a toda hora.",
      zona: AQ,
      creado_en: diaHora(22, 11, 30),
      revisado_en: null,
      reportes: [...reportes("cobro_abusivo", 2, ocultoGasfitero), ...reportes("ofensivo", 1, diaHora(1, 18, 2))],
    },
  ];

  const publicaciones: PublicacionOculta[] = [
    {
      id: "p-celulares",
      autor: "5d0e7a21-0c4f-4b8e-9d11-2f6a3c8e19ab",
      autor_nombre: "Kevin T.",
      categoria: "otro",
      mensaje: "Vendo celulares baratos, escríbeme al privado",
      zona: SF,
      creado_en: diaHora(0, 7, 10),
      revisado_en: null,
      tiene_foto: false,
      foto_url: null,
      reportes: reportes("spam", 4, ocultoCelulares),
    },
    {
      id: "p-moto",
      autor: "7b1c22d4-5e6f-4a70-8b9c-0d1e2f3a4b5c",
      autor_nombre: "Marta L.",
      categoria: "seguridad",
      mensaje: "Cuidado con el señor de la moto roja, roba",
      zona: AQ,
      creado_en: diaHora(1, 18, 40),
      revisado_en: null,
      tiene_foto: false,
      foto_url: null,
      reportes: reportes("acusa_persona", 3, ocultoMoto),
    },
  ];

  const comentarios: ComentarioOculto[] = [
    {
      id: "c-gasfitero",
      autor: "1e2d3c4b-5a69-4788-9a0b-1c2d3e4f5a6b",
      autor_nombre: "Luis G.",
      texto: "No lo llamen, ese señor es un estafador y un borracho",
      en_publicacion: false,
      zona: AQ,
      creado_en: diaHora(1, 15, 0),
      revisado_en: null,
      reportes: reportes("ofensivo", 3, ocultoComentario),
    },
  ];

  const reportesPersonas: (ReportePersona & { nombre: string; contexto: string })[] = [
    ...reportes("pidio_dinero", 2, hace(180)).map((r) => ({
      ...r,
      usuario_id: "a3f91b20-4c5d-4e6f-8a7b-9c0d1e2f7c21",
      nombre: "Julio P.",
      contexto: `Ofreció ayuda en 2 pedidos de ${AQ}`,
    })),
    ...reportes("spam", 1, hace(300)).map((r) => ({
      ...r,
      usuario_id: "5d0e7a21-0c4f-4b8e-9d11-2f6a3c8e19ab",
      nombre: "Kevin T.",
      contexto: `Comentarios en ${SF}`,
    })),
  ];

  const bloqueos: (Bloqueo & { nombre: string })[] = [
    {
      user_id: "9bc2d4e6-1a3b-4c5d-8e9f-0a1b2c3de004",
      nombre: "Rubén A.",
      motivo: "Trato ofensivo",
      creado_por: DEMO_ADMIN_ID,
      creado_en: diaHora(5, 17, 20),
    },
  ];

  const grupos: GrupoApoyo[] = [
    { id: "g-1", nombre: "Brigada Vecinal San Francisco", tipo: "brigada", contacto: "956 123 456", direccion: null, zona: SF, verificada: true },
    { id: "g-2", nombre: "Posta San Francisco", tipo: "salud", contacto: "056 221 000", direccion: "Av. Principal 120", zona: SF, verificada: true },
    { id: "g-3", nombre: "Punto seguro Bodega Rosita", tipo: "punto_seguro", contacto: null, direccion: "Calle Los Pinos 8", zona: AQ, verificada: false },
    { id: "g-4", nombre: "Serenazgo La Tinguiña", tipo: "municipalidad", contacto: "056 400 112", direccion: null, zona: TG, verificada: false },
  ];

  return { servicios, publicaciones, comentarios, reportesPersonas, bloqueos, grupos };
}

let estado = crearEstado();

/** Vuelve a los datos de ejemplo iniciales (al entrar en modo demo). */
export function reiniciarDemo(): void {
  estado = crearEstado();
}

export const demo = () => estado;

export function demoZonas(): Zona[] {
  return [
    { id: "z-sf", nombre: SF, lat_centro: -14.07, lng_centro: -75.72, radio_m: 1500 },
    { id: "z-aq", nombre: AQ, lat_centro: -14.09, lng_centro: -75.7, radio_m: 1500 },
    { id: "z-tg", nombre: TG, lat_centro: -14.04, lng_centro: -75.69, radio_m: 1500 },
  ];
}

/** Nombre de ejemplo de una persona, si existe en la demo. */
export function nombreDemo(userId: string): string | null {
  const e = estado;
  return (
    e.reportesPersonas.find((r) => r.usuario_id === userId)?.nombre ??
    e.bloqueos.find((b) => b.user_id === userId)?.nombre ??
    e.publicaciones.find((p) => p.autor === userId)?.autor_nombre ??
    e.comentarios.find((c) => c.autor === userId)?.autor_nombre ??
    null
  );
}

export function demoEmergenciasActivas(): EmergenciaActiva[] {
  return [
    {
      id: "e-0412",
      codigo: "EM-0412",
      zona: SF,
      creado_en: hace(4),
      expira_en: new Date(Date.now() + 116 * 60_000).toISOString(),
      practica: false,
      avisar_vecinos: true,
      eslabones: [
        { orden: 1, contacto: "Ana", estado: "no_contesto" },
        { orden: 2, contacto: "Jorge", estado: "llamando" },
        { orden: 3, contacto: "Posta San Francisco", estado: "pendiente" },
      ],
      vecinos_van: 2,
      vecinos_retirados: 1,
    },
    {
      id: "e-0411",
      codigo: "EM-0411",
      zona: AQ,
      creado_en: hace(9),
      expira_en: new Date(Date.now() + 111 * 60_000).toISOString(),
      practica: true,
      avisar_vecinos: false,
      eslabones: [
        { orden: 1, contacto: "Lucía", estado: "hablamos" },
        { orden: 2, contacto: "Pedro", estado: "pendiente" },
      ],
      vecinos_van: 0,
      vecinos_retirados: 0,
    },
  ];
}

export function demoEmergenciasCerradas(): EmergenciaCerrada[] {
  const inicio1 = diaHora(1, 18, 42);
  const inicio2 = diaHora(2, 9, 10);
  const inicio3 = diaHora(5, 21, 3);
  return [
    {
      id: "e-0409",
      codigo: "EM-0409",
      zona: SF,
      practica: false,
      creado_en: inicio1,
      cerrada_en: diaHora(1, 18, 57),
      termino: "estoy_bien",
      vieron: [
        { vecino_id: "c-1", nombre: "Carlos M.", vio_datos_en: diaHora(1, 18, 44), reportado: false },
        { vecino_id: "c-2", nombre: "Elena R.", vio_datos_en: diaHora(1, 18, 46), reportado: false },
      ],
    },
    {
      id: "e-0405",
      codigo: "EM-0405",
      zona: AQ,
      practica: false,
      creado_en: inicio2,
      cerrada_en: diaHora(2, 9, 40),
      termino: "vencio",
      vieron: [
        {
          vecino_id: "a3f91b20-4c5d-4e6f-8a7b-9c0d1e2f7c21",
          nombre: "Julio P.",
          vio_datos_en: diaHora(2, 9, 12),
          reportado: true,
        },
      ],
    },
    {
      id: "e-0398",
      codigo: "EM-0398",
      zona: TG,
      practica: false,
      creado_en: inicio3,
      cerrada_en: diaHora(5, 21, 20),
      termino: "estoy_bien",
      vieron: [],
    },
  ];
}

/** Totales de ejemplo por zona para «Resumen del día». */
export const DEMO_RESUMEN = {
  negocios: { [SF]: 11, [AQ]: 8, [TG]: 5 } as Record<string, number>,
  pedidos: { [SF]: 3, [AQ]: 2, [TG]: 1 } as Record<string, number>,
  emergenciasHoy: [
    { zona: SF, practica: false },
    { zona: AQ, practica: true },
    { zona: TG, practica: true },
  ],
  avisos: [
    { zona: SF, tipo: "inicio" as const },
    { zona: SF, tipo: "cierre" as const },
    { zona: AQ, tipo: "inicio" as const },
    { zona: AQ, tipo: "cierre" as const },
  ],
  /** Aperturas por día (últimos 7, el último es hoy) y segundos totales de hoy, por zona. */
  uso: {
    [SF]: { aperturas: [43, 50, 47, 55, 52, 63, 60], segundosHoy: 11_520 },
    [AQ]: { aperturas: [33, 38, 36, 42, 41, 49, 45], segundosHoy: 8_400 },
    [TG]: { aperturas: [20, 22, 21, 24, 25, 28, 27], segundosHoy: 5_160 },
  } as Record<string, { aperturas: number[]; segundosHoy: number }>,
};
