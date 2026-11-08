// Edge Function alerta-vecinos: arma las dependencias reales y sirve el handler.
// Spec: backend/docs/spec_alerta_vecinos.md
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los pone Supabase; nunca se copian al código.
// Secreto opcional: EXPO_ACCESS_TOKEN (solo si el proyecto de Expo exige envíos autenticados).
import { createClient } from "npm:@supabase/supabase-js@2";
import { crearHandler, type Destinatario, ErrorEnvio, type MensajePush, type Ticket } from "./handler.ts";

const URL_EXPO = "https://exp.host/--/api/v2/push/send";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SIN_SESION_GUARDADA = { persistSession: false, autoRefreshToken: false };

// service_role: solo para reclamar_aviso y vecinos_para_alerta, después de comprobar la dueña.
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: SIN_SESION_GUARDADA });

/** Con la clave publicable y el JWT de quien llama (RLS): ¿la emergencia es suya? */
async function esDeQuienLlama(authorization: string, emergenciaId: string): Promise<boolean> {
  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: SIN_SESION_GUARDADA,
  });
  const { data: usuario, error: errorUsuario } = await sb.auth.getUser(authorization.slice("Bearer ".length));
  if (errorUsuario || !usuario.user) return false;
  const { data, error } = await sb.from("emergencias").select("id, persona").eq("id", emergenciaId).maybeSingle();
  if (error) throw error;
  // emergencias_leer también deja ver la emergencia al admin y al vecino que confirmó «voy».
  return data?.persona === usuario.user.id;
}

async function reclamarAviso(emergenciaId: string, tipo: "inicio" | "cierre"): Promise<boolean> {
  const { data, error } = await admin.rpc("reclamar_aviso", { p_emergencia: emergenciaId, p_tipo: tipo });
  if (error) throw error;
  return data === true;
}

async function destinatarios(emergenciaId: string): Promise<Destinatario[]> {
  const { data, error } = await admin.rpc("vecinos_para_alerta", { p_emergencia: emergenciaId });
  if (error) throw error;
  return (data ?? []) as Destinatario[];
}

async function enviarLote(mensajes: MensajePush[]): Promise<Ticket[]> {
  const tokenExpo = Deno.env.get("EXPO_ACCESS_TOKEN");
  const respuesta = await fetch(URL_EXPO, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(tokenExpo ? { Authorization: `Bearer ${tokenExpo}` } : {}),
    },
    body: JSON.stringify(mensajes),
    signal: AbortSignal.timeout(10_000),
  });
  if (!respuesta.ok) throw new ErrorEnvio(respuesta.status >= 500, `EXPO_HTTP_${respuesta.status}`);
  const cuerpo = await respuesta.json();
  return (cuerpo?.data ?? []) as Ticket[];
}

Deno.serve(crearHandler({
  esDeQuienLlama,
  reclamarAviso,
  destinatarios,
  enviarLote,
  esperar: (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
  log: (texto) => console.log(texto),
}));
