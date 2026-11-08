// Handler de alerta-vecinos sin red: Supabase, Expo, la espera y el log llegan inyectados.
// index.ts arma las piezas reales. Spec: backend/docs/spec_alerta_vecinos.md

export type TipoAviso = "inicio" | "cierre";

export interface Destinatario {
  token: string;
  distancia_m: number;
}

export interface MensajePush {
  to: string;
  title: string;
  body: string;
  sound: "default";
  priority: "high";
  data: { emergencia_id: string; tipo: TipoAviso };
  channelId?: string;
}

export interface Ticket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

/** Falla al enviar un lote. reintentable = 5xx de Expo. */
export class ErrorEnvio extends Error {
  constructor(public reintentable: boolean, message: string) {
    super(message);
    this.name = "ErrorEnvio";
  }
}

export interface Dependencias {
  /** Lee la emergencia con el JWT de quien llama y compara persona con su usuario. */
  esDeQuienLlama: (authorization: string, emergenciaId: string) => Promise<boolean>;
  /** reclamar_aviso con service_role: true una sola vez por emergencia y tipo. */
  reclamarAviso: (emergenciaId: string, tipo: TipoAviso) => Promise<boolean>;
  /** vecinos_para_alerta con service_role. */
  destinatarios: (emergenciaId: string) => Promise<Destinatario[]>;
  /** POST a Expo Push con hasta 100 mensajes. */
  enviarLote: (mensajes: MensajePush[]) => Promise<Ticket[]>;
  esperar: (ms: number) => Promise<void>;
  /** Solo tipos de error y conteos: nunca tokens, ubicaciones ni distancias. */
  log: (texto: string) => void;
}

const TAMANO_LOTE = 100;
const ESPERA_REINTENTO_MS = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// const CANAL_ANDROID = "emergencias"; // Activar cuando la app confirme que crea este canal.

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function textoAviso(tipo: TipoAviso, distanciaM: number): string {
  if (tipo === "cierre") return "Ya no hace falta, gracias";
  const metros = Math.max(10, Math.round(distanciaM / 10) * 10);
  return `Un vecino necesita ayuda a ${metros} m`;
}

function mensaje(d: Destinatario, emergenciaId: string, tipo: TipoAviso): MensajePush {
  return {
    to: d.token,
    title: "Kuna",
    body: textoAviso(tipo, d.distancia_m),
    sound: "default",
    priority: "high",
    data: { emergencia_id: emergenciaId, tipo },
    // channelId: CANAL_ANDROID,
  };
}

function leerEntrada(cuerpo: unknown): { emergenciaId: string; tipo: TipoAviso } | null {
  if (typeof cuerpo !== "object" || cuerpo === null) return null;
  const { emergencia_id, tipo } = cuerpo as Record<string, unknown>;
  if (typeof emergencia_id !== "string" || !UUID.test(emergencia_id)) return null;
  if (tipo !== "inicio" && tipo !== "cierre") return null;
  return { emergenciaId: emergencia_id, tipo };
}

/** Red caída, tiempo agotado o 5xx de Expo. */
function esReintentable(error: unknown): boolean {
  if (error instanceof ErrorEnvio) return error.reintentable;
  return error instanceof TypeError || (error instanceof Error && error.name === "TimeoutError");
}

function nombreError(error: unknown): string {
  if (error instanceof ErrorEnvio) return error.message;
  return error instanceof Error ? error.name : typeof error;
}

export function crearHandler(deps: Dependencias) {
  async function enviarConReintento(lote: MensajePush[]): Promise<Ticket[] | null> {
    try {
      return await deps.enviarLote(lote);
    } catch (error) {
      if (esReintentable(error)) {
        await deps.esperar(ESPERA_REINTENTO_MS);
        try {
          return await deps.enviarLote(lote);
        } catch (otraVez) {
          error = otraVez;
        }
      }
      deps.log(`alerta-vecinos: LOTE_FALLIDO ${nombreError(error)} mensajes=${lote.length}`);
      return null;
    }
  }

  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return json(405, { error: "METODO_INVALIDO" });

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json(401, { error: "SIN_SESION" });

    const entrada = leerEntrada(await req.json().catch(() => null));
    if (!entrada) return json(400, { error: "ENTRADA_INVALIDA" });
    const { emergenciaId, tipo } = entrada;

    let destinatarios: Destinatario[];
    try {
      // La dueña se comprueba antes de usar service_role.
      if (!(await deps.esDeQuienLlama(authorization, emergenciaId))) return json(403, { error: "NO_ES_TUYA" });
      if (!(await deps.reclamarAviso(emergenciaId, tipo))) return json(200, { avisados: 0 });
      destinatarios = await deps.destinatarios(emergenciaId);
    } catch (error) {
      deps.log(`alerta-vecinos: ERROR_INTERNO ${nombreError(error)}`);
      return json(500, { error: "ERROR_INTERNO" });
    }

    const mensajes = destinatarios.map((d) => mensaje(d, emergenciaId, tipo));
    let ok = 0;
    let noRegistrados = 0;
    let otrosErrores = 0;
    let lotesFallidos = 0;
    for (let i = 0; i < mensajes.length; i += TAMANO_LOTE) {
      const lote = mensajes.slice(i, i + TAMANO_LOTE);
      const tickets = await enviarConReintento(lote);
      if (!tickets) {
        lotesFallidos++;
        continue;
      }
      for (const t of tickets) {
        if (t.status === "ok") ok++;
        else if (t.details?.error === "DeviceNotRegistered") noRegistrados++;
        else otrosErrores++;
      }
    }

    deps.log(
      `alerta-vecinos: tipo=${tipo} destinatarios=${mensajes.length} lotes=${Math.ceil(mensajes.length / TAMANO_LOTE)} ` +
        `ok=${ok} no_registrados=${noRegistrados} otros_errores=${otrosErrores} lotes_fallidos=${lotesFallidos}`,
    );
    return json(200, { avisados: ok });
  };
}
