import { obtenerSupabase } from "./supabase";

export async function yoAyudo(pedidoId: string): Promise<{ nombre: string; celular: string }> {
  const { data, error } = await obtenerSupabase().rpc("yo_ayudo", { p_pedido_id: pedidoId });
  if (error) throw error;
  const fila = Array.isArray(data) ? data[0] : data;
  const registro = (fila ?? {}) as { nombre?: string; celular?: string };
  return { nombre: registro.nombre ?? "", celular: registro.celular ?? "" };
}

export async function borrarMisDatos(): Promise<void> {
  const { error } = await obtenerSupabase().rpc("borrar_mis_datos");
  if (error) throw error;
}
