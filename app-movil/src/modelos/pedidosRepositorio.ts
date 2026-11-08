/**
 * Modelo. Lee pedidos_cercanos. Crear inserta en pedidos_ayuda.
 * Yo ayudo llama a la función yo_ayudo(p_pedido_id), que desde el script 07 devuelve un booleano
 * y exige celular verificado (CELULAR_NO_VERIFICADO). Quien pidió ve a su ayudante en la vista
 * ayudas_recibidas (opción A1 del contrato del Módulo 2).
 */
import type {
  AyudaRecibida,
  CategoriaPedido,
  CrearPedidoDTO,
  FilaPedidoCercano,
  PedidoCercano,
} from "./tipos";
import { obtenerSupabase } from "./supabase";

const CATEGORIAS: readonly CategoriaPedido[] = [
  "arreglos",
  "compras",
  "transporte",
  "salud",
  "desastre_natural",
  "apoyo",
];

export async function listarPedidosCercanos(): Promise<PedidoCercano[]> {
  const { data, error } = await obtenerSupabase().from("pedidos_cercanos").select("*");
  if (error) throw error;
  return (data ?? []).map((fila) => mapearPedido(fila as FilaPedidoCercano));
}

export async function crearPedido(dto: CrearPedidoDTO): Promise<void> {
  const { error } = await obtenerSupabase().from("pedidos_ayuda").insert({
    categoria: dto.categoria,
    descripcion: dto.descripcion,
  });
  if (error) throw error;
}

/** Ofrece ayuda. No entrega datos de quien pidió: devuelve true si quedó registrada. */
export async function yoAyudo(pedidoId: string): Promise<boolean> {
  const { data, error } = await obtenerSupabase().rpc("yo_ayudo", { p_pedido_id: pedidoId });
  if (error) throw error;
  return data === true;
}

/** Vecinos que se ofrecieron a mis pedidos (vista ayudas_recibidas), del más reciente al más antiguo. */
export async function listarAyudasRecibidas(): Promise<AyudaRecibida[]> {
  const { data, error } = await obtenerSupabase()
    .from("ayudas_recibidas")
    .select("id, pedido_id, categoria, ayudante_nombre, ayudante_celular, creado_en")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((fila: Record<string, unknown>) => ({
    id: texto(fila.id),
    pedidoId: texto(fila.pedido_id),
    categoria: categoria(fila.categoria),
    ayudanteNombre: texto(fila.ayudante_nombre),
    ayudanteCelular: texto(fila.ayudante_celular),
    creadoEn: texto(fila.creado_en),
  }));
}

export async function actualizarPedido(
  id: string,
  descripcion: string,
  estado: "abierto" | "atendido" | "cancelado",
): Promise<void> {
  const { error } = await obtenerSupabase()
    .from("pedidos_ayuda")
    .update({ descripcion, estado })
    .eq("id", id);
  if (error) throw error;
}

function mapearPedido(fila: FilaPedidoCercano): PedidoCercano {
  const minutos = numero(fila.minutos_antiguedad);
  return {
    id: texto(fila.id),
    nombreCorto: texto(fila.nombre_corto),
    categoria: categoria(fila.categoria),
    descripcion: texto(fila.descripcion),
    antiguedad: minutos < 60 ? `hace ${minutos} min` : `hace ${Math.max(1, Math.round(minutos / 60))} h`,
    esMio: Boolean(fila.es_mio),
    yaOfreci: Boolean(fila.ya_ofreci),
  };
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function numero(valor: unknown): number {
  const convertido = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function categoria(valor: unknown): CategoriaPedido {
  if (typeof valor === "string" && CATEGORIAS.includes(valor as CategoriaPedido)) {
    return valor as CategoriaPedido;
  }
  return "arreglos";
}

/** Cuenta cuántos vecinos ofrecieron ayuda para un pedido (política ayudas_leer permite al autor). */
export async function contarAyudasOfrecidas(pedidoId: string): Promise<number> {
  const { count, error } = await obtenerSupabase()
    .from("ayudas_ofrecidas")
    .select("id", { count: "exact", head: true })
    .eq("pedido_id", pedidoId);
  if (error) throw error;
  return count ?? 0;
}
