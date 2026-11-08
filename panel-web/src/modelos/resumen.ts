/**
 * Modelo. Totales del día por zona para «Resumen del día». Solo cuenta: no identifica a nadie.
 */
import { DEMO_RESUMEN } from "./demo";
import { cliente, enDemo, esperaDemo } from "./supabase";
import { zonasDeServiciosVisibles } from "./serviciosOcultos";
import { listarZonas, zonaDeUbicacion } from "./zonas";

/** Un hecho con la zona donde ocurrió (null si no se pudo ubicar). */
export interface PorZona {
  zona: string | null;
}

export interface UsoApp {
  /** Aperturas de los últimos 7 días; el último es hoy. */
  aperturas: number[];
  segundosHoy: number;
}

export interface DatosResumen {
  negocios: PorZona[];
  pedidos: PorZona[];
  emergenciasHoy: (PorZona & { practica: boolean })[];
  avisos: (PorZona & { tipo: "inicio" | "cierre" })[];
  /** Uso por zona, o null si la base todavía no guarda el uso de la app. */
  uso: Record<string, UsoApp> | null;
}

/** Medianoche de hoy en Lima, como ISO. */
export function inicioDelDiaLima(ahora = new Date()): string {
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(ahora);
  return new Date(`${fecha}T00:00:00-05:00`).toISOString();
}

const repetir = (conteo: Record<string, number>): PorZona[] =>
  Object.entries(conteo).flatMap(([zona, n]) => Array.from({ length: n }, () => ({ zona })));

export async function leerResumen(): Promise<DatosResumen> {
  if (enDemo()) {
    await esperaDemo();
    return {
      negocios: repetir(DEMO_RESUMEN.negocios),
      pedidos: repetir(DEMO_RESUMEN.pedidos),
      emergenciasHoy: DEMO_RESUMEN.emergenciasHoy,
      avisos: DEMO_RESUMEN.avisos,
      uso: DEMO_RESUMEN.uso,
    };
  }

  const sb = cliente();
  const hoy = inicioDelDiaLima();
  const ahora = new Date().toISOString();

  const [negocios, pedidos, emergencias, avisos, zonas] = await Promise.all([
    zonasDeServiciosVisibles(),
    sb.from("pedidos_ayuda").select("zonas(nombre)").eq("estado", "abierto").gt("expira_en", ahora),
    sb.from("emergencias").select("practica, lat_aprox, lng_aprox").gte("creado_en", hoy),
    sb
      .from("emergencias")
      .select("avisado_en, cierre_avisado_en, lat_aprox, lng_aprox")
      .or(`avisado_en.gte.${hoy},cierre_avisado_en.gte.${hoy}`),
    listarZonas().catch(() => []),
  ]);
  for (const r of [pedidos, emergencias, avisos]) if (r.error) throw r.error;

  type ConZona = { zonas: { nombre: string } | null };
  type Ubicada = { lat_aprox: number | null; lng_aprox: number | null };
  const zonaDe = (f: Ubicada) => zonaDeUbicacion(zonas, f.lat_aprox, f.lng_aprox);

  return {
    negocios: negocios.map((zona) => ({ zona })),
    pedidos: ((pedidos.data ?? []) as unknown as ConZona[]).map((f) => ({ zona: f.zonas?.nombre ?? null })),
    emergenciasHoy: ((emergencias.data ?? []) as (Ubicada & { practica: boolean })[]).map((f) => ({
      zona: zonaDe(f),
      practica: f.practica,
    })),
    avisos: ((avisos.data ?? []) as (Ubicada & { avisado_en: string | null; cierre_avisado_en: string | null })[]).flatMap(
      (f) => {
        const zona = zonaDe(f);
        const lista: { zona: string | null; tipo: "inicio" | "cierre" }[] = [];
        const desde = Date.parse(hoy);
        if (f.avisado_en && Date.parse(f.avisado_en) >= desde) lista.push({ zona, tipo: "inicio" });
        if (f.cierre_avisado_en && Date.parse(f.cierre_avisado_en) >= desde) lista.push({ zona, tipo: "cierre" });
        return lista;
      },
    ),
    // La base aún no registra aperturas de la app (zona, día y segundos).
    uso: null,
  };
}
