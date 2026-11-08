/**
 * Modelo. Emergencias activas y cerradas. Solo lectura (es_admin()).
 * No pide nombre, dirección ni coordenadas exactas: el panel solo da seguimiento.
 * La ubicación aproximada (3 decimales) se usa aquí solo para saber la zona y no sale del modelo.
 */
import { demoEmergenciasActivas, demoEmergenciasCerradas } from "./demo";
import { cliente, enDemo, esperaDemo } from "./supabase";
import { listarZonas, zonaDeUbicacion } from "./zonas";

export interface Eslabon {
  orden: number;
  contacto: string | null;
  estado: string;
}

export interface EmergenciaActiva {
  id: string;
  /** Código corto para hablar de la emergencia sin identificar a nadie, p. ej. «EM-3F9A». */
  codigo: string;
  zona: string | null;
  creado_en: string;
  expira_en: string;
  practica: boolean;
  avisar_vecinos: boolean;
  eslabones: Eslabon[];
  vecinos_van: number;
  /** Vecinos que dijeron «Ya no puedo ir». */
  vecinos_retirados: number;
}

export interface VecinoQueVio {
  vecino_id: string;
  /** Solo en demo: el admin no puede leer perfiles ajenos. */
  nombre: string | null;
  vio_datos_en: string;
  reportado: boolean;
}

export interface EmergenciaCerrada {
  id: string;
  codigo: string;
  zona: string | null;
  practica: boolean;
  creado_en: string;
  cerrada_en: string;
  /** «Estoy bien» si la cerró la persona; «vencio» si se cerró sola al vencer. */
  termino: "estoy_bien" | "vencio";
  vieron: VecinoQueVio[];
}

export const codigoEmergencia = (id: string) => `EM-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

type FilaActiva = {
  id: string;
  creado_en: string;
  expira_en: string;
  practica: boolean;
  avisar_vecinos: boolean;
  lat_aprox: number | null;
  lng_aprox: number | null;
  eslabones: Eslabon[] | null;
  vecinos_que_van: { estado: string }[] | null;
};

export async function listarEmergenciasActivas(): Promise<EmergenciaActiva[]> {
  if (enDemo()) {
    await esperaDemo(150);
    return demoEmergenciasActivas();
  }
  const [{ data, error }, zonas] = await Promise.all([
    cliente()
      .from("emergencias")
      .select(
        "id, creado_en, expira_en, practica, avisar_vecinos, lat_aprox, lng_aprox, eslabones(orden, contacto, estado), vecinos_que_van(estado)",
      )
      .eq("estado", "activa")
      .gt("expira_en", new Date().toISOString())
      .order("creado_en", { ascending: false }),
    listarZonas().catch(() => []),
  ]);
  if (error) throw error;
  return ((data ?? []) as unknown as FilaActiva[]).map((f) => ({
    id: f.id,
    codigo: codigoEmergencia(f.id),
    zona: zonaDeUbicacion(zonas, f.lat_aprox, f.lng_aprox),
    creado_en: f.creado_en,
    expira_en: f.expira_en,
    practica: f.practica,
    avisar_vecinos: f.avisar_vecinos,
    eslabones: [...(f.eslabones ?? [])].sort((a, b) => a.orden - b.orden),
    vecinos_van: (f.vecinos_que_van ?? []).filter((v) => v.estado === "va").length,
    vecinos_retirados: (f.vecinos_que_van ?? []).filter((v) => v.estado === "ya_no_puede").length,
  }));
}

type FilaCerrada = {
  id: string;
  creado_en: string;
  expira_en: string;
  cerrada_en: string | null;
  practica: boolean;
  lat_aprox: number | null;
  lng_aprox: number | null;
  vecinos_que_van: { vecino_id: string; vio_datos_en: string | null; reportado: boolean }[] | null;
};

/** Emergencias cerradas de los últimos 7 días (la base las borra después). */
export async function listarEmergenciasCerradas(): Promise<EmergenciaCerrada[]> {
  if (enDemo()) {
    await esperaDemo();
    return demoEmergenciasCerradas();
  }
  const desde = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const [{ data, error }, zonas] = await Promise.all([
    cliente()
      .from("emergencias")
      .select("id, creado_en, expira_en, cerrada_en, practica, lat_aprox, lng_aprox, vecinos_que_van(vecino_id, vio_datos_en, reportado)")
      .eq("estado", "cerrada")
      .gte("cerrada_en", desde)
      .order("cerrada_en", { ascending: false }),
    listarZonas().catch(() => []),
  ]);
  if (error) throw error;
  return ((data ?? []) as unknown as FilaCerrada[]).map((f) => {
    const cerrada = f.cerrada_en ?? f.expira_en;
    return {
      id: f.id,
      codigo: codigoEmergencia(f.id),
      zona: zonaDeUbicacion(zonas, f.lat_aprox, f.lng_aprox),
      practica: f.practica,
      creado_en: f.creado_en,
      cerrada_en: cerrada,
      // Al vencer, la limpieza la cierra con cerrada_en ≥ expira_en.
      termino: Date.parse(cerrada) >= Date.parse(f.expira_en) - 1_000 ? "vencio" : "estoy_bien",
      vieron: (f.vecinos_que_van ?? [])
        .filter((v): v is { vecino_id: string; vio_datos_en: string; reportado: boolean } => v.vio_datos_en !== null)
        .sort((a, b) => Date.parse(a.vio_datos_en) - Date.parse(b.vio_datos_en))
        .map((v) => ({ ...v, nombre: null })),
    };
  });
}

/**
 * Avisa ante cualquier cambio en emergencias, eslabones o vecinos_que_van (Realtime respeta la RLS).
 * No usa el contenido del evento: quien escucha vuelve a leer la lista. Devuelve cómo dejar de escuchar.
 */
export function escucharEmergencias(alCambiar: () => void, alCambiarConexion: (enVivo: boolean) => void): () => void {
  if (enDemo()) {
    alCambiarConexion(true);
    return () => {};
  }
  const sb = cliente();
  const canal = sb.channel("panel-emergencias");
  for (const tabla of ["emergencias", "eslabones", "vecinos_que_van"]) {
    canal.on("postgres_changes", { event: "*", schema: "public", table: tabla }, alCambiar);
  }
  canal.subscribe((estado) => alCambiarConexion(estado === "SUBSCRIBED"));
  return () => {
    void sb.removeChannel(canal);
  };
}
