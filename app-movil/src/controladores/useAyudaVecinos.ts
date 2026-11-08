/**
 * Controlador. Ayuda entre vecinos (Mockup v4, F1). Reúne lo que necesitan las pantallas nuevas sin
 * que importen Supabase ni repositorios:
 * - qué le falta al perfil para escribir (el celular se pide recién aquí, decisión del equipo),
 * - enviar un pedido (pedidos_ayuda) y ofrecer ayuda (RPC yo_ayudo), con mensajes honestos.
 * Alineado con el contrato del Módulo 2 (scripts 07 y 08).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { actualizarPedido, crearPedido, listarAyudasRecibidas, yoAyudo } from "../modelos/pedidosRepositorio";
import { leerPerfilLocal, guardarPerfilLocal } from "../modelos/local/perfil";
import { CATEGORIAS_AYUDA_V4, type ValorCategoriaAyuda } from "../modelos/categoriasAyuda";
import { asegurarSesionAnonima, tieneConfiguracionSupabase } from "../modelos/supabase";
import type { CategoriaPedido, PedidoCercano } from "../modelos/tipos";
import { codigoDeError, mensajeDeError, revisarTexto } from "./errores";
import { usePedidosCercanos } from "./usePedidosCercanos";
import { exigirEscritura } from "./guarda";
import { useConexion } from "./useConexion";

/** Lo que falta para publicar o pedir ayuda: nada, el celular, o terminar el registro (nombre/zona). */
export type FaltaParaEscribir = null | "celular" | "registro";

export async function faltaParaEscribir(): Promise<FaltaParaEscribir> {
  const perfil = await leerPerfilLocal();
  if (!perfil?.nombre || perfil.nombre.trim().length < 2 || !perfil.zonaId) return "registro";
  if (!/^9\d{8}$/.test(perfil.celular?.trim() ?? "")) return "celular";
  return null;
}

export function validarCelular(texto: string): string | null {
  const limpio = texto.replace(/\D/g, "");
  if (limpio.length === 0) return "Escribe tu celular";
  if (!limpio.startsWith("9")) return "El celular empieza con 9";
  if (limpio.length !== 9) return "El celular tiene 9 números";
  return null;
}

export async function guardarCelular(texto: string): Promise<void> {
  const perfil = (await leerPerfilLocal()) ?? {};
  await guardarPerfilLocal({ ...perfil, celular: texto.replace(/\D/g, "") });
}

/** La categoría ya se puede guardar en la base actual (desastre_natural todavía no). */
export function categoriaDisponible(valor: ValorCategoriaAyuda): valor is CategoriaPedido {
  return CATEGORIAS_AYUDA_V4.find((c) => c.valor === valor)?.disponibleEnBase === true;
}

/** Mensaje honesto si esta copia de la app no tiene el .env de Supabase; null si está conectada. */
export function sinBase(): string | null {
  return tieneConfiguracionSupabase() ? null : "Esta copia de la app no está conectada al servidor. Pídele al equipo el archivo .env.";
}

/**
 * Escribe en la base con el perfil guardado en el teléfono (leído al momento, así toma el celular
 * recién escrito). Devuelve un mensaje honesto si no se pudo; null si salió bien.
 * Lo usan también Servicios (E3 visto bueno, E4 publicar).
 */
export async function escribir(internetReal: boolean, ejecutar: () => Promise<void>): Promise<string | null> {
  const faltaServidor = sinBase();
  if (faltaServidor) return faltaServidor;
  const perfil = await leerPerfilLocal();
  let mensaje: string | null = null;
  const ok = await exigirEscritura({
    perfil,
    internetReal,
    irAlRegistro: () => {},
    avisar: (texto) => {
      mensaje = texto;
    },
    ejecutar,
  });
  return ok ? null : (mensaje ?? "No se pudo enviar. Intenta otra vez.");
}

export function useEnviarPedido() {
  const cliente = useQueryClient();
  const conexion = useConexion();
  const mutacion = useMutation({
    mutationFn: async ({ categoria, descripcion }: { categoria: ValorCategoriaAyuda; descripcion: string }) => {
      if (!categoriaDisponible(categoria)) {
        throw new Error("Este tipo de pedido todavía no se puede enviar. Si es urgente, usa Emergencia.");
      }
      const texto = descripcion.trim();
      const invalido = revisarTexto(texto, true);
      if (invalido) throw new Error(invalido);
      if (categoria === "salud" && /medicina|diagn[oó]stico|receta/i.test(texto)) {
        throw new Error("No escribas diagnósticos ni medicinas.");
      }
      const error = await escribir(conexion !== "sin internet", () => crearPedido({ categoria, descripcion: texto }));
      if (error) throw new Error(error);
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["pedidos-cercanos"] }),
  });
  return {
    enviar: mutacion.mutateAsync,
    enviando: mutacion.isPending,
    enviado: mutacion.isSuccess,
    error: mutacion.error instanceof Error ? mutacion.error.message : null,
    reiniciar: mutacion.reset,
  };
}

/**
 * F1 «Quiero ayudar». yo_ayudo (script 07) devuelve true y NO entrega el contacto de quien pidió:
 * es quien pidió quien ve el número del ayudante (ayudas_recibidas) y llama.
 * Exige celular verificado: si falta, `necesitaVerificar` pasa a true y la vista lleva a verificarlo.
 */
export function useOfrecerAyuda() {
  const cliente = useQueryClient();
  const conexion = useConexion();
  const [ofrecido, setOfrecido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [necesitaVerificar, setNecesitaVerificar] = useState(false);

  const ofrecer = useCallback(
    async (pedidoId: string) => {
      setError(null);
      setNecesitaVerificar(false);
      setOcupado(pedidoId);
      let codigo: string | null = null;
      const problema = await escribir(conexion !== "sin internet", async () => {
        try {
          await yoAyudo(pedidoId);
        } catch (causa) {
          codigo = codigoDeError(causa);
          throw causa;
        }
      });
      setOcupado(null);
      if (codigo === "CELULAR_NO_VERIFICADO") {
        setNecesitaVerificar(true);
        return;
      }
      if (problema) {
        setError(problema);
        if (codigo === "PEDIDO_NO_DISPONIBLE") void cliente.invalidateQueries({ queryKey: ["pedidos-cercanos"] });
        return;
      }
      setOfrecido(pedidoId);
      void cliente.invalidateQueries({ queryKey: ["pedidos-cercanos"] });
    },
    [cliente, conexion],
  );

  return { ofrecer, ofrecido, error, ocupado, necesitaVerificar };
}

/**
 * «Mis pedidos» del Mockup v4: mis pedidos abiertos (pedidos_cercanos, es_mio) con los vecinos que
 * se ofrecieron (ayudas_recibidas: nombre corto y celular). Permite marcarlos como atendidos o cancelarlos.
 */
export function useMisPedidosVecinos() {
  const cliente = useQueryClient();
  const conexion = useConexion();
  const pedidos = usePedidosCercanos();
  const ayudas = useQuery({
    queryKey: ["ayudas-recibidas"],
    queryFn: async () => {
      await asegurarSesionAnonima();
      return listarAyudasRecibidas();
    },
    enabled: !sinBase(),
    staleTime: 1000 * 30,
    retry: 1,
  });
  const [error, setError] = useState<string | null>(null);

  const cambiarEstado = useCallback(
    async (pedido: PedidoCercano, estado: "atendido" | "cancelado") => {
      setError(null);
      const problema = await escribir(conexion !== "sin internet", () => actualizarPedido(pedido.id, pedido.descripcion, estado));
      if (problema) setError(problema);
      await cliente.invalidateQueries({ queryKey: ["pedidos-cercanos"] });
      await cliente.invalidateQueries({ queryKey: ["ayudas-recibidas"] });
    },
    [cliente, conexion],
  );

  const mios = pedidos.pedidos.filter((p) => p.esMio);
  const lista = ayudas.data ?? [];
  return {
    pedidos: mios.map((p) => ({ pedido: p, ayudantes: lista.filter((a) => a.pedidoId === p.id) })),
    cargando: pedidos.cargando || ayudas.isLoading,
    error: error ?? pedidos.error ?? (ayudas.error ? mensajeDeError(ayudas.error, "general") : null),
    recargar: () => {
      void cliente.invalidateQueries({ queryKey: ["pedidos-cercanos"] });
      void ayudas.refetch();
    },
    cambiarEstado,
  };
}
