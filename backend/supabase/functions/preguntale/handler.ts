// Handler de preguntale sin dependencias de red: la IA y la búsqueda llegan inyectadas,
// así las pruebas corren sin internet. index.ts arma las reales.
// Contrato: backend/docs/spec_preguntale.md
import {
  type Boton,
  noEntiende,
  type Respuesta,
  validarEntrada,
  validarLlamada,
  validarTexto,
} from "./herramientas.ts";

export interface LlamadaIA {
  nombre: unknown;
  argumentos: unknown;
}

export interface ServicioEncontrado {
  id: string;
  nombre: string;
  oficio: string;
  abierto_ahora: boolean;
  vistos_buenos_total: number;
  contacto: string | null;
  lat: number | null;
  lng: number | null;
}

export interface Ubicacion {
  lat: number;
  lng: number;
}

export interface Dependencias {
  /** Solo recibe el texto. Devuelve la función que eligió la IA, o null si no eligió ninguna. */
  llamarIA: (texto: string) => Promise<LlamadaIA | null>;
  /** Lee servicios_publicos con el JWT de quien pregunta (RLS). Filtra por zona_id si viene en el filtro. */
  buscarServicios: (
    authorization: string,
    filtro: FiltroServicios,
    ubicacion?: Ubicacion,
  ) => Promise<ServicioEncontrado[]>;
}

export interface FiltroServicios {
  oficio: string;
  abierto_ahora?: boolean;
  zona_id?: string;
}

const NO_PUDE = "No pude responder ahora. Elige una opción.";
const SIN_BARRIO = "¿En qué barrio estás?";

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Distancia aproximada en metros; alcanza para ordenar dentro de un barrio. */
function distancia(a: Ubicacion, b: Ubicacion): number {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.hypot(x, y) * 6_371_000;
}

function ordenar(servicios: ServicioEncontrado[], ubicacion?: Ubicacion): ServicioEncontrado[] {
  if (!ubicacion) return [...servicios].sort((a, b) => b.vistos_buenos_total - a.vistos_buenos_total);
  const lejos = (s: ServicioEncontrado) =>
    s.lat === null || s.lng === null ? Infinity : distancia(ubicacion, { lat: s.lat, lng: s.lng });
  return [...servicios].sort((a, b) => lejos(a) - lejos(b));
}

function botonesDeServicios(servicios: ServicioEncontrado[]): Boton[] {
  return servicios.flatMap((s) => [
    ...(s.contacto ? [{ etiqueta: `Llamar a ${s.nombre}`, funcion: "llamar" as const, argumentos: { servicio_id: s.id } }] : []),
    ...(s.lat !== null ? [{ etiqueta: `Cómo llegar a ${s.nombre}`, funcion: "como_llegar" as const, argumentos: { servicio_id: s.id } }] : []),
  ]);
}

function textoDe(funcion: string, a: Record<string, string | boolean>): string {
  switch (funcion) {
    case "crear_recordatorio":
      return `¿Lo guardo? ${a.que} a las ${a.hora}${a.repetir === "diario" ? ", todos los días" : ""}.`;
    case "ver_mi_horario":
      return "Este es tu horario.";
    case "pedir_ayuda":
      return `¿Lo guardo? Pedir ayuda: ${a.descripcion ?? a.categoria}`.replace(/([^.!?])$/, "$1.");
    case "llamar":
      return a.a_quien ? `¿Llamo a ${a.a_quien}?` : "¿Llamo a este servicio?";
    case "como_llegar":
      return a.destino ? `Te muestro cómo llegar a ${a.destino}.` : "Te muestro cómo llegar.";
    default:
      return "";
  }
}

export function crearHandler(deps: Dependencias) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return json(405, { error: "METODO_INVALIDO" });

    // Supabase ya valida el JWT antes de entrar; esto cubre la ejecución local sin verificación.
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json(401, { error: "SIN_SESION" });

    const entrada = validarEntrada(await req.json().catch(() => null));
    if (!entrada) return json(400, { error: "TEXTO_INVALIDO" });

    let llamada: LlamadaIA | null;
    try {
      llamada = await deps.llamarIA(entrada.texto);
    } catch (error) {
      // Nunca se registra el texto ni la ubicación de quien pregunta.
      console.error("preguntale: IA_NO_DISPONIBLE", error instanceof Error ? error.name : typeof error);
      return json(200, noEntiende(NO_PUDE));
    }

    const valida = llamada ? validarLlamada(llamada.nombre, llamada.argumentos) : null;
    if (!valida) return json(200, noEntiende());

    const respuesta: Respuesta = { ...valida, texto: "", botones: [] };

    if (valida.funcion === "buscar_servicio") {
      const oficio = valida.argumentos.oficio as string;
      const ubicacion = entrada.lat !== undefined && entrada.lng !== undefined
        ? { lat: entrada.lat, lng: entrada.lng }
        : undefined;
      // Con ubicación se ordena por cercanía; sin ella, se acota a la zona; sin ninguna, se pregunta.
      if (!ubicacion && !entrada.zona_id) return json(200, noEntiende(SIN_BARRIO));
      const filtro = { ...valida.argumentos } as unknown as FiltroServicios;
      if (!ubicacion) filtro.zona_id = entrada.zona_id;
      let encontrados: ServicioEncontrado[];
      try {
        encontrados = await deps.buscarServicios(authorization, filtro, ubicacion);
      } catch (error) {
        console.error("preguntale: BUSQUEDA_FALLIDA", error instanceof Error ? error.name : typeof error);
        return json(200, noEntiende(NO_PUDE));
      }
      const servicios = ordenar(encontrados, ubicacion).slice(0, 3);
      const nombre = oficio.replaceAll("_", " ");
      respuesta.servicios = servicios;
      respuesta.botones = botonesDeServicios(servicios);
      respuesta.texto = servicios.length === 0
        ? `No encontré ${nombre} en tu barrio.`
        : `Encontré ${servicios.length} ${servicios.length === 1 ? "opción" : "opciones"} de ${nombre}.`;
    } else {
      respuesta.texto = textoDe(valida.funcion, valida.argumentos);
    }

    respuesta.texto = validarTexto(respuesta.texto) ?? "Listo.";
    return json(200, respuesta);
  };
}
