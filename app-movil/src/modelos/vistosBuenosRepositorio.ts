import { obtenerSupabase } from "./supabase";
import type { DarVistoBuenoDTO } from "./tipos";

export async function crearVistoBueno(dto: DarVistoBuenoDTO): Promise<void> {
  const { error } = await obtenerSupabase().from("vistos_buenos").insert({
    servicio_id: dto.servicioId,
    motivo: dto.motivo,
    comentario: dto.comentario ?? null,
    mostrar_comentario: dto.mostrarComentario,
  });
  if (error) throw error;
}

export async function retirarVistoBueno(id: string): Promise<void> {
  const { error } = await obtenerSupabase().from("vistos_buenos").delete().eq("id", id);
  if (error) throw error;
}
