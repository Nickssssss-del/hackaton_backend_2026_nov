/**
 * Controladores para la Parte B: Ayuda entre vecinos.
 * - useYoAyudo: llama a la RPC yo_ayudo, muestra Llamar y WhatsApp con aviso antiestafa.
 * - useMisPedidos: lista pedidos propios (es_mio), permite cancelar y "Ya me ayudaron", muestra conteo de ayudas ofrecidas.
 * - usePedirFavor: pedir un favor con exigirEscritura.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { exigirEscritura } from "./guarda";
import { listarPedidosCercanos, yoAyudo, actualizarPedido, crearPedido, contarAyudasOfrecidas } from "../modelos/pedidosRepositorio";
import type { CategoriaPedido, CrearPedidoDTO, PedidoCercano } from "../modelos/tipos";
import { mensajeDeError, revisarTexto } from "./errores";
import { usePerfil } from "./usePerfil";
import { useConexion } from "./useConexion";

/** Hook para "Yo ayudo" - devuelve nombre y celular del autor del pedido */
export function useYoAyudo() {
  const cliente = useQueryClient();
  const { perfil } = usePerfil();
  const conexion = useConexion();
  const [contacto, setContacto] = useState<{ nombre: string; celular: string } | null>(null);
  const [avisoAntiestafa, setAvisoAntiestafa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutacion = useMutation({
    mutationFn: async (pedidoId: string) => {
      setAvisoAntiestafa(true);
      return null;
    },
    onError: (causa) => setError(mensajeDeError(causa, "general")),
  });

  const confirmarAyuda = async (pedidoId: string) => {
    setError(null);
    const ok = await exigirEscritura({
      perfil,
      internetReal: conexion === "conectado",
      irAlRegistro: () => {},
      avisar: (mensaje) => { throw new Error(mensaje); },
      ejecutar: async () => {
        // Pantalla anterior al Mockup v4. Desde el script 07, yo_ayudo ya no entrega el contacto
        // de quien pidió: quien pidió ve al ayudante en ayudas_recibidas.
        await yoAyudo(pedidoId);
        setContacto(null);
      },
    });
    if (!ok) {
      setAvisoAntiestafa(false);
    }
    return ok;
  };

  const cerrarContacto = () => {
    setContacto(null);
    setAvisoAntiestafa(false);
  };

  return {
    contacto,
    avisoAntiestafa,
    setAvisoAntiestafa,
    error,
    ayudar: mutacion.mutate,
    confirmarAyuda,
    cerrarContacto,
    ayudando: mutacion.isPending,
  };
}

/** Hook para mis pedidos (es_mio = true en pedidos_cercanos) con conteo de ayudas ofrecidas */
export function useMisPedidos() {
  const cliente = useQueryClient();
  const { perfil } = usePerfil();
  const conexion = useConexion();

  const consulta = useQuery({
    queryKey: ["mis-pedidos"],
    queryFn: async () => {
      const todos = await listarPedidosCercanos();
      return todos.filter((p: PedidoCercano) => p.esMio);
    },
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 2,
  });

  // Query paralela para contar ayudas ofrecidas por cada pedido propio
  const consultaAyudas = useQuery({
    queryKey: ["mis-pedidos-ayudas"],
    queryFn: async () => {
      const misPedidos = consulta.data ?? [];
      if (misPedidos.length === 0) return {};
      const ids = misPedidos.map((p) => p.id);
      const conteos = await Promise.all(
        ids.map(async (id) => {
          try {
            const n = await contarAyudasOfrecidas(id);
            return { id, count: n };
          } catch {
            return { id, count: null };
          }
        })
      );
      return Object.fromEntries(conteos.map((c) => [c.id, c.count]));
    },
    enabled: (consulta.data ?? []).length > 0,
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 2,
  });

  const mutacionActualizar = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: "cancelado" | "atendido" }) => {
      const ok = await exigirEscritura({
        perfil,
        internetReal: conexion === "conectado",
        irAlRegistro: () => {},
        avisar: (mensaje) => { throw new Error(mensaje); },
        ejecutar: async () => {
          await actualizarPedido(id, "", estado);
        },
      });
      if (!ok) throw new Error("No se pudo actualizar");
    },
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["mis-pedidos"] });
      await cliente.invalidateQueries({ queryKey: ["pedidos-cercanos"] });
      await cliente.invalidateQueries({ queryKey: ["mis-pedidos-ayudas"] });
    },
    onError: (causa) => { throw new Error(mensajeDeError(causa, "general")); },
  });

  return {
    pedidos: consulta.data ?? [],
    cargando: consulta.isLoading,
    error: consulta.error ? mensajeDeError(consulta.error, "general") : null,
    recargar: () => consulta.refetch(),
    actualizarEstado: mutacionActualizar.mutate,
    actualizando: mutacionActualizar.isPending,
    ayudasOfrecidas: consultaAyudas.data ?? {},
  };
}

/** Hook para pedir un favor - usa exigirEscritura */
export function usePedirFavor() {
  const cliente = useQueryClient();
  const { perfil } = usePerfil();
  const conexion = useConexion();
  const [error, setError] = useState<string | null>(null);

  const mutacion = useMutation({
    mutationFn: async (dto: CrearPedidoDTO) => {
      // Validaciones locales
      const invalido = revisarTexto(dto.descripcion, true);
      if (invalido) throw new Error(invalido);
      if (dto.categoria === "salud" && /medicina|diagn[oó]stico|receta/i.test(dto.descripcion)) {
        throw new Error("No escribas diagnósticos ni medicinas.");
      }

      const ok = await exigirEscritura({
        perfil,
        internetReal: conexion === "conectado",
        irAlRegistro: () => {},
        avisar: (mensaje) => { throw new Error(mensaje); },
        ejecutar: async () => {
          await crearPedido(dto);
        },
      });

      if (!ok) throw new Error("No se pudo enviar el pedido");
    },
    onSuccess: async () => {
      setError(null);
      await cliente.invalidateQueries({ queryKey: ["pedidos-cercanos"] });
    },
    onError: (causa) => setError(mensajeDeError(causa, "general")),
  });

  return {
    enviando: mutacion.isPending,
    error,
    enviar: mutacion.mutate,
  };
}