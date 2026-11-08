// Edge Function preguntale: arma las dependencias reales y sirve el handler.
// Contrato: backend/docs/spec_preguntale.md
// Secretos (npx supabase secrets set): IA_API_KEY (Groq), IA_MODELO (opcional, por defecto openai/gpt-oss-20b).
// SUPABASE_URL y SUPABASE_ANON_KEY los pone Supabase; nunca se copian al código.
import { createClient } from "npm:@supabase/supabase-js@2";
import { crearHandler, type FiltroServicios, type ServicioEncontrado } from "./handler.ts";
import { llamarIA } from "./ia.ts";

/** Lee servicios_publicos con el JWT de quien pregunta: aplica RLS, sin service_role. */
async function buscarServicios(authorization: string, filtro: FiltroServicios): Promise<ServicioEncontrado[]> {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  // shortcut: trae hasta 50 y el handler ordena por distancia en memoria; si un oficio pasa de 50, ordenar en SQL.
  let consulta = sb
    .from("servicios_publicos")
    .select("id, nombre, oficio, abierto_ahora, vistos_buenos_total, contacto, lat, lng")
    .eq("oficio", filtro.oficio)
    .limit(50);
  if (filtro.abierto_ahora) consulta = consulta.eq("abierto_ahora", true);
  if (filtro.zona_id) consulta = consulta.eq("zona_id", filtro.zona_id);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as ServicioEncontrado[];
}

Deno.serve(crearHandler({ llamarIA, buscarServicios }));
