/**
 * Controlador. Lista y gestiona los servicios propios (es_mio = true).
 * Usa la vista servicios_publicos filtrando por es_mio.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarServiciosPublicos } from "../modelos/serviciosRepositorio";
import { actualizarServicio, eliminarServicio } from "../modelos/serviciosRepositorio";
import type { CrearServicioDTO } from "../modelos/tipos";
import { mensajeDeError } from "./errores";

export function useMisServicios() {
  const cliente = useQueryClient();

  const consulta = useQuery({
    queryKey: ["mis-servicios"],
    queryFn: async () => {
      const todos = await listarServiciosPublicos();
      return todos.filter((s) => s.esMio);
    },
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 2,
  });

  const mutacionEditar = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: Partial<CrearServicioDTO> }) => {
      await actualizarServicio(id, dto);
    },
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["mis-servicios"] });
      await cliente.invalidateQueries({ queryKey: ["servicios"] });
    },
    onError: (causa) => { throw new Error(mensajeDeError(causa, "general")); },
  });

  const mutacionBorrar = useMutation({
    mutationFn: async (id: string) => {
      await eliminarServicio(id);
    },
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["mis-servicios"] });
      await cliente.invalidateQueries({ queryKey: ["servicios"] });
    },
    onError: (causa) => { throw new Error(mensajeDeError(causa, "general")); },
  });

  return {
    servicios: consulta.data ?? [],
    cargando: consulta.isLoading,
    error: consulta.error ? mensajeDeError(consulta.error, "general") : null,
    recargar: () => consulta.refetch(),
    editar: mutacionEditar.mutate,
    editarEnviando: mutacionEditar.isPending,
    borrar: mutacionBorrar.mutate,
    borrarEnviando: mutacionBorrar.isPending,
  };
}