/**
 * Modelo. Lee pedidos_cercanos. Crear inserta en pedidos_ayuda.
 * Yo ayudo llama a la función yo_ayudo(p_pedido_id).
 */
import type {
  CategoriaPedido,
  CrearPedidoDTO,
  FilaPedidoCercano,
  PedidoCercano,
} from "./tipos";
import { supabase } from "./supabase";

const CATEGORIAS: readonly CategoriaPedido[] = [
  "arreglos",
  "compras",
  "transporte",
  "salud",
];

export async function listarPedidosCercanos(): Promise<PedidoCercano[]> {
  const { data, error } = await supabase.from("pedidos_cercanos").select("*");
  if (error) throw error;
  return (data ?? []).map((fila) => mapearPedido(fila as FilaPedidoCercano));
}

export async function crearPedido(dto: CrearPedidoDTO): Promise<void> {
  const { error } = await supabase.from("pedidos_ayuda").insert({
    categoria: dto.categoria,
    descripcion: dto.descripcion,
  });
  if (error) throw error;
}

export async function yoAyudo(pedidoId: string): Promise<{ nombre: string; celular: string }> {
  const { data, error } = await supabase.rpc("yo_ayudo", { p_pedido_id: pedidoId });
  if (error) throw error;
  const fila = Array.isArray(data) ? data[0] : data;
  const registro = (fila ?? {}) as { nombre?: string; celular?: string };
  return {
    nombre: registro.nombre ?? "",
    celular: registro.celular ?? "",
  };
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
