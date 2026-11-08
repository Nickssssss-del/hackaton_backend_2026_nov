/**
 * Controlador. Comunidad (F2, F3) y comentarios (F2 y E3). Las vistas no importan Supabase.
 * Escribir exige perfil completo (nombre, celular y zona): se reutiliza `escribir` de Ayuda.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  borrarComentario,
  comentar,
  listarComentarios,
  type Destino,
} from "../modelos/comentariosRepositorio";
import type { CategoriaPublicacion, DestinoReporte, MotivoReporteComunidad } from "../modelos/comunidad";
import {
  borrarPublicacion,
  listarPublicaciones,
  marcarVoy,
  publicar,
  reportarComunidad,
} from "../modelos/comunidadRepositorio";
import { asegurarSesionAnonima } from "../modelos/supabase";
import { mensajeDeError, revisarTexto } from "./errores";
import { escribir, sinBase } from "./useAyudaVecinos";
import { useConexion } from "./useConexion";
import { usePerfil } from "./usePerfil";

const CLAVE_PUBLICACIONES = ["publicaciones"];

export function usePublicaciones() {
  const { perfil } = usePerfil();
  const consulta = useQuery({
    queryKey: CLAVE_PUBLICACIONES,
    queryFn: async () => {
      await asegurarSesionAnonima();
      return listarPublicaciones();
    },
    enabled: !!perfil?.zonaId && !sinBase(),
    gcTime: 1000 * 60 * 60 * 24,
    staleTime: 1000 * 60,
    retry: 1,
  });
  return {
    publicaciones: consulta.data ?? [],
    cargando: consulta.isLoading,
    error: consulta.error ? mensajeDeError(consulta.error, "general") : null,
    sinZona: !perfil?.zonaId,
    recargar: () => void consulta.refetch(),
  };
}

/** Acción con mensaje honesto si falla. Devuelve true si salió bien. */
function useEscritura() {
  const conexion = useConexion();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ejecutar = useCallback(
    async (accion: () => Promise<void>) => {
      setError(null);
      setOcupado(true);
      const problema = await escribir(conexion !== "sin internet", accion);
      setOcupado(false);
      if (problema) setError(problema);
      return problema === null;
    },
    [conexion],
  );
  return { ejecutar, error, setError, ocupado };
}

export function useVoy() {
  const cliente = useQueryClient();
  const e = useEscritura();
  const alternar = useCallback(
    async (publicacionId: string, voy: boolean) => {
      const ok = await e.ejecutar(() => marcarVoy(publicacionId, voy));
      if (ok) await cliente.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
      return ok;
    },
    [cliente, e],
  );
  return { alternar, error: e.error, ocupado: e.ocupado };
}

export function usePublicar() {
  const cliente = useQueryClient();
  const mutacion = useMutation({
    mutationFn: async ({ categoria, mensaje, internet }: { categoria: CategoriaPublicacion; mensaje: string; internet: boolean }) => {
      const texto = mensaje.trim();
      const invalido = revisarTexto(texto, true);
      if (invalido) throw new Error(invalido);
      const problema = await escribir(internet, () => publicar(categoria, texto));
      if (problema) throw new Error(problema);
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES }),
  });
  const conexion = useConexion();
  return {
    publicar: (categoria: CategoriaPublicacion, mensaje: string) =>
      mutacion.mutateAsync({ categoria, mensaje, internet: conexion !== "sin internet" }),
    enviando: mutacion.isPending,
    hecho: mutacion.isSuccess,
    error: mutacion.error instanceof Error ? mutacion.error.message : null,
  };
}

export function useBorrarPublicacion() {
  const cliente = useQueryClient();
  const e = useEscritura();
  const borrar = useCallback(
    async (id: string) => {
      const ok = await e.ejecutar(() => borrarPublicacion(id));
      if (ok) await cliente.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
      return ok;
    },
    [cliente, e],
  );
  return { borrar, error: e.error, ocupado: e.ocupado };
}

export function useReportarComunidad() {
  const cliente = useQueryClient();
  const e = useEscritura();
  const [hecho, setHecho] = useState(false);
  const reportar = useCallback(
    async (destino: DestinoReporte, motivo: MotivoReporteComunidad) => {
      setHecho(false);
      const ok = await e.ejecutar(async () => {
        try {
          await reportarComunidad(destino, motivo);
        } catch (causa) {
          // 23505: ya lo había reportado; para la persona, el reporte ya está hecho.
          if ((causa as { code?: string })?.code === "23505") return;
          throw causa;
        }
      });
      if (ok) {
        setHecho(true);
        await cliente.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
      }
      return ok;
    },
    [cliente, e],
  );
  return { reportar, hecho, error: e.error, ocupado: e.ocupado };
}

function claveComentarios(destino: Destino) {
  return ["comentarios", "servicioId" in destino ? `s:${destino.servicioId}` : `p:${destino.publicacionId}`];
}

/** Comentarios de un negocio (E3) o de una publicación (F2), con enviar y borrar el propio. */
export function useComentarios(destino: Destino | null) {
  const cliente = useQueryClient();
  const e = useEscritura();
  const clave = destino ? claveComentarios(destino) : ["comentarios", "ninguno"];
  const consulta = useQuery({
    queryKey: clave,
    queryFn: async () => {
      await asegurarSesionAnonima();
      return destino ? listarComentarios(destino) : [];
    },
    enabled: !!destino && !sinBase(),
    staleTime: 1000 * 30,
    retry: 1,
  });

  const enviar = useCallback(
    async (texto: string) => {
      if (!destino) return false;
      const limpio = texto.trim();
      const invalido = revisarTexto(limpio, true);
      if (invalido) {
        e.setError(invalido);
        return false;
      }
      const ok = await e.ejecutar(() => comentar(destino, limpio));
      if (ok) {
        await cliente.invalidateQueries({ queryKey: claveComentarios(destino) });
        await cliente.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
      }
      return ok;
    },
    [cliente, destino, e],
  );

  const borrar = useCallback(
    async (id: string) => {
      const ok = await e.ejecutar(() => borrarComentario(id));
      if (ok && destino) await cliente.invalidateQueries({ queryKey: claveComentarios(destino) });
      return ok;
    },
    [cliente, destino, e],
  );

  return {
    comentarios: consulta.data ?? [],
    cargando: consulta.isLoading,
    errorLectura: consulta.error ? mensajeDeError(consulta.error, "general") : null,
    enviar,
    borrar,
    error: e.error,
    ocupado: e.ocupado,
  };
}
