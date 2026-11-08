/**
 * Controlador. Ayuda entre vecinos (Mockup v4, F1). Reúne lo que necesitan las pantallas nuevas sin
 * que importen Supabase ni repositorios:
 * - qué le falta al perfil para escribir (el celular se pide recién aquí, decisión del equipo),
 * - enviar un pedido (pedidos_ayuda) y ofrecer ayuda (RPC yo_ayudo), con mensajes honestos.
 * La base no cambia: se usan las mismas tablas, vista y RPC que las pantallas anteriores.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { crearPedido, yoAyudo } from "../modelos/pedidosRepositorio";
import { leerPerfilLocal, guardarPerfilLocal } from "../modelos/local/perfil";
import { CATEGORIAS_AYUDA_V4, type ValorCategoriaAyuda } from "../modelos/categoriasAyuda";
import { tieneConfiguracionSupabase } from "../modelos/supabase";
import type { CategoriaPedido } from "../modelos/tipos";
import { revisarTexto } from "./errores";
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

async function escribir(internetReal: boolean, ejecutar: () => Promise<void>): Promise<string | null> {
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

export function useOfrecerAyuda() {
  const cliente = useQueryClient();
  const conexion = useConexion();
  const [contacto, setContacto] = useState<{ pedidoId: string; nombre: string; celular: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const ofrecer = useCallback(
    async (pedidoId: string) => {
      setError(null);
      setOcupado(pedidoId);
      const problema = await escribir(conexion !== "sin internet", async () => {
        const r = await yoAyudo(pedidoId);
        setContacto({ pedidoId, ...r });
      });
      setOcupado(null);
      if (problema) setError(problema);
      else void cliente.invalidateQueries({ queryKey: ["pedidos-cercanos"] });
    },
    [cliente, conexion],
  );

  return { ofrecer, contacto, cerrar: () => setContacto(null), error, ocupado };
}
