/**
 * Controlador. Pedidos de la zona y el botón Yo ayudo.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { perfilEstaCompleto } from "../modelos/perfilRepositorio";
import { crearPedido, listarPedidosCercanos, yoAyudo } from "../modelos/pedidosRepositorio";
import type { CategoriaPedido } from "../modelos/tipos";
import { mensajeDeError, revisarTexto } from "./errores";
import { exigirInternet } from "./red";

export function usePedirFavor() {
  const cliente = useQueryClient();
  const consulta = useQuery({
    queryKey: ["pedidos-cercanos"],
    queryFn: listarPedidosCercanos,
  });
  const [error, setError] = useState<string | null>(null);
  const [contacto, setContacto] = useState<{ nombre: string; celular: string } | null>(null);

  const publicar = useMutation({
    mutationFn: async (entrada: { categoria: CategoriaPedido; descripcion: string }) => {
      const invalido = revisarTexto(entrada.descripcion, true);
      if (invalido) throw new Error(invalido);
      if (entrada.categoria === "salud" && /medicina|diagn[oó]stico|receta/i.test(entrada.descripcion)) {
        throw new Error("No escribas diagnósticos ni medicinas.");
      }
      await exigirInternet();
      if (!(await perfilEstaCompleto())) throw new Error("PERFIL_INCOMPLETO");
      await crearPedido({
        categoria: entrada.categoria,
        descripcion: entrada.descripcion.trim(),
        zonaId: "",
      });
    },
    onSuccess: async () => {
      setError(null);
      await cliente.invalidateQueries({ queryKey: ["pedidos-cercanos"] });
    },
    onError: (causa) => setError(mensajeDe(causa)),
  });

  const ayudar = useMutation({
    mutationFn: async (pedidoId: string) => {
      await exigirInternet();
      if (!(await perfilEstaCompleto())) throw new Error("PERFIL_INCOMPLETO");
      return yoAyudo(pedidoId);
    },
    onSuccess: async (dato) => {
      setContacto(dato);
      setError(null);
      await cliente.invalidateQueries({ queryKey: ["pedidos-cercanos"] });
    },
    onError: (causa) => setError(mensajeDe(causa)),
  });

  return {
    pedidos: consulta.data ?? [],
    cargando: consulta.isLoading,
    enviando: publicar.isPending || ayudar.isPending,
    error: error ?? (consulta.error ? mensajeDeError(consulta.error) : null),
    contacto,
    enviar: publicar.mutate,
    ayudar: ayudar.mutate,
  };
}

function mensajeDe(causa: unknown): string {
  if (causa instanceof Error && !causa.message.includes("_") && causa.message.length < 90) {
    return causa.message;
  }
  return mensajeDeError(causa);
}
