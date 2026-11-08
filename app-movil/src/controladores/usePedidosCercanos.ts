/**
 * Controlador. Pedidos cercanos con react-query.
 * No importa supabase ni Repositorio en la vista.
 */
import { useQuery } from "@tanstack/react-query";
import { usePerfil } from "./usePerfil";
import { useConexion } from "./useConexion";
import { listarPedidosCercanos } from "../modelos/pedidosRepositorio";
import { asegurarSesionAnonima } from "../modelos/supabase";
import { mensajeDeError } from "./errores";

export function usePedidosCercanos() {
  const { perfil } = usePerfil();
  const conexion = useConexion();

  const consulta = useQuery({
    queryKey: ["pedidos-cercanos"],
    queryFn: async () => {
      await asegurarSesionAnonima();
      return listarPedidosCercanos();
    },
    enabled: !!perfil?.zonaId,
    gcTime: 1000 * 60 * 60 * 24,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const esCopia = conexion !== "conectado" && consulta.data && consulta.data.length > 0;
  const copiaFecha = esCopia && consulta.dataUpdatedAt
    ? new Date(consulta.dataUpdatedAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  const pedidos = consulta.data ?? [];
  const cargando = consulta.isLoading;
  const error = consulta.error ? mensajeDeError(consulta.error, "general") : null;

  return { pedidos, cargando, error, esCopia, copiaFecha };
}