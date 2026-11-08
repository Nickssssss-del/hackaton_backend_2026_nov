/**
 * Controlador. Servicios del Mockup v4 (E1–E4). Reúne lo que necesitan las pantallas nuevas sin
 * que importen Supabase ni repositorios:
 * - visto bueno con un toque y «Comentar con mi voz» (tabla vistos_buenos, una vez por servicio),
 * - publicar o editar el negocio (tabla servicios) con el celular del perfil,
 * - enlaces de mapas para «Ir» y «Ver en el mapa».
 * La base no cambia: mismas tablas, vista servicios_publicos y triggers que las pantallas anteriores.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { redondear3 } from "../modelos/geo";
import { leerPerfilLocal } from "../modelos/local/perfil";
import { leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import { guardarVistosHechos, obtenerVistosHechos } from "../modelos/local/votosHechos";
import { actualizarServicio, crearServicio, darVistoBueno, eliminarServicio, reportarServicio } from "../modelos/serviciosRepositorio";
import type { MotivoReporte, MotivoVistoBueno, Oficio, ServicioPublico } from "../modelos/tipos";
import { revisarTexto } from "./errores";
import { escribir } from "./useAyudaVecinos";
import { useConexion } from "./useConexion";

/** Motivo que se guarda con el visto bueno de un toque (la base exige uno). */
export const MOTIVO_UN_TOQUE: MotivoVistoBueno = "confiable";

export const MOTIVOS_VISTO_BUENO: readonly { valor: MotivoVistoBueno; etiqueta: string }[] = [
  { valor: "confiable", etiqueta: "Confiable" },
  { valor: "trato_amable", etiqueta: "Trato amable" },
  { valor: "buen_precio", etiqueta: "Buen precio" },
  { valor: "viene_domicilio", etiqueta: "Viene a domicilio" },
];

export const MOTIVOS_REPORTE: readonly { valor: MotivoReporte; etiqueta: string }[] = [
  { valor: "estafa", etiqueta: "Parece una estafa" },
  { valor: "datos_falsos", etiqueta: "Datos falsos" },
  { valor: "ofensivo", etiqueta: "Es ofensivo" },
  { valor: "no_existe", etiqueta: "Ya no existe" },
  { valor: "otro", etiqueta: "Otro motivo" },
];

/** ¿Ya di mi visto bueno a este servicio? Se relee al volver a la pantalla. */
export function useYaDiVistoBueno(servicioId: string | undefined) {
  const [yaDi, setYaDi] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (!servicioId) return;
      void obtenerVistosHechos().then((lista) => setYaDi(lista.includes(servicioId)));
    }, [servicioId]),
  );
  return { yaDi, marcar: () => setYaDi(true) };
}

export function useVistoBueno() {
  const cliente = useQueryClient();
  const conexion = useConexion();
  const mutacion = useMutation({
    mutationFn: async (dto: { servicioId: string; motivo?: MotivoVistoBueno; comentario?: string; mostrarComentario?: boolean }) => {
      const comentario = dto.comentario?.trim() || undefined;
      if (comentario) {
        const invalido = revisarTexto(comentario, false);
        if (invalido) throw new Error(invalido);
      }
      const hechos = await obtenerVistosHechos();
      if (hechos.includes(dto.servicioId)) throw new Error("Ya diste tu visto bueno a este negocio.");
      const problema = await escribir(conexion !== "sin internet", () =>
        darVistoBueno({
          servicioId: dto.servicioId,
          motivo: dto.motivo ?? MOTIVO_UN_TOQUE,
          comentario,
          mostrarComentario: Boolean(comentario) && (dto.mostrarComentario ?? true),
        }),
      );
      if (problema) {
        // La base rechaza el segundo voto (único por persona y servicio): se recuerda en el teléfono.
        // (VOTO_REPETIDO llega traducido por mensajeDeError: «Ya diste tu Visto Bueno…»).
        if (/ya diste|repetid|duplicate|unique/i.test(problema)) {
          await guardarVistosHechos([...hechos, dto.servicioId]);
          throw new Error("Ya diste tu visto bueno a este negocio.");
        }
        throw new Error(problema);
      }
      await guardarVistosHechos([...hechos, dto.servicioId]);
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: ["servicios"] }),
  });
  return {
    dar: mutacion.mutateAsync,
    enviando: mutacion.isPending,
    hecho: mutacion.isSuccess,
    error: mutacion.error instanceof Error ? mutacion.error.message : null,
    reiniciar: mutacion.reset,
  };
}

export function useReportar() {
  const conexion = useConexion();
  const mutacion = useMutation({
    mutationFn: async ({ servicioId, motivo }: { servicioId: string; motivo: MotivoReporte }) => {
      const problema = await escribir(conexion !== "sin internet", () => reportarServicio(servicioId, motivo));
      if (problema) throw new Error(problema);
    },
  });
  return {
    reportar: mutacion.mutateAsync,
    enviando: mutacion.isPending,
    hecho: mutacion.isSuccess,
    error: mutacion.error instanceof Error ? mutacion.error.message : null,
  };
}

export function validarNombreNegocio(nombre: string): string | null {
  const limpio = nombre.trim();
  if (limpio.length < 2) return "Falta el nombre";
  if (limpio.length > 60) return "El nombre es muy largo";
  return revisarTexto(limpio, false);
}

/**
 * E4. Publica (o edita, con `id`) el negocio. Al publicar se muestran el nombre y el celular del
 * perfil: es lo que la persona acepta con «Mis vecinos pueden verlo» (decisión D-09).
 */
export function usePublicarNegocio() {
  const cliente = useQueryClient();
  const conexion = useConexion();
  const mutacion = useMutation({
    mutationFn: async ({ id, oficio, nombre }: { id?: string; oficio: Oficio; nombre: string }) => {
      const invalido = validarNombreNegocio(nombre);
      if (invalido) throw new Error(invalido);
      const perfil = await leerPerfilLocal();
      const contacto = perfil?.celular?.trim() || undefined;
      const problema = await escribir(conexion !== "sin internet", async () => {
        if (id) {
          await actualizarServicio(id, { oficio, nombreNegocio: nombre.trim(), contacto, mostrarTelefono: true });
          return;
        }
        const ultima = await leerUltimaUbicacion();
        await crearServicio({
          oficio,
          nombreNegocio: nombre.trim(),
          contacto,
          mostrarTelefono: true,
          mostrarDireccion: false,
          disponibleEmergencia: false,
          lat: ultima ? redondear3(ultima.lat) : undefined,
          lng: ultima ? redondear3(ultima.lng) : undefined,
        });
      });
      if (problema) throw new Error(problema);
    },
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["servicios"] });
      await cliente.invalidateQueries({ queryKey: ["mis-servicios"] });
    },
  });
  return {
    publicar: mutacion.mutateAsync,
    enviando: mutacion.isPending,
    hecho: mutacion.isSuccess,
    error: mutacion.error instanceof Error ? mutacion.error.message : null,
    reiniciar: mutacion.reset,
  };
}

/** Mis servicios: borrar un negocio propio (la base solo deja borrar los del dueño). */
export function useBorrarNegocio() {
  const cliente = useQueryClient();
  const conexion = useConexion();
  const mutacion = useMutation({
    mutationFn: async (id: string) => {
      const problema = await escribir(conexion !== "sin internet", () => eliminarServicio(id));
      if (problema) throw new Error(problema);
    },
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ["servicios"] });
      await cliente.invalidateQueries({ queryKey: ["mis-servicios"] });
    },
  });
  return {
    borrar: mutacion.mutateAsync,
    enviando: mutacion.isPending,
    error: mutacion.error instanceof Error ? mutacion.error.message : null,
  };
}

/** «Ir»: indicaciones a pie en Google Maps (o búsqueda por dirección si no hay coordenadas). */
export function urlComoLlegar(servicio: Pick<ServicioPublico, "lat" | "lng" | "direccion">): string | null {
  if (servicio.lat !== undefined && servicio.lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${servicio.lat},${servicio.lng}&travelmode=walking`;
  }
  if (servicio.direccion) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(servicio.direccion)}`;
  }
  return null;
}

/** «Ver en el mapa» de E2: busca la categoría alrededor de la ubicación guardada. */
export function urlMapaCategoria(busqueda: string, ubicacion: { lat: number; lng: number } | null): string {
  const base = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busqueda)}`;
  return ubicacion ? `${base}%20cerca%20de%20${ubicacion.lat},${ubicacion.lng}` : base;
}

/** Minutos a pie redondeados para mostrar («3 min»); undefined si no hay ubicación. */
export function textoMinutos(minutos: number | undefined): string | null {
  if (minutos === undefined || !Number.isFinite(minutos)) return null;
  return `${Math.max(1, Math.round(minutos))} min`;
}
