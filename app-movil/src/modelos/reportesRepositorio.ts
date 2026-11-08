import { obtenerSupabase } from "./supabase";
import type { MotivoReporte } from "./tipos";

export async function crearReporte(servicioId: string, motivo: MotivoReporte): Promise<void> {
  const { error } = await obtenerSupabase().from("reportes").insert({
    servicio_id: servicioId,
    motivo,
  });
  if (error) throw error;
}
