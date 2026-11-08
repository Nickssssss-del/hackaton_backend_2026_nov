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

/** Datos que pide E4. Horario, precio y descripción son opcionales (vienen del formulario anterior). */
export interface DatosNegocio {
  id?: string;
  oficio: Oficio;
  nombre: string;
  /** «Mis vecinos pueden verlo» → servicios.visible_vecinos (script 07). En No, solo lo ve el dueño. */
  visible: boolean;
  /** "HH:MM" de apertura y cierre, o null si no tiene horario fijo. */
  horario: { abre: string; cierra: string } | null;
  precioDesde: number | null;
  descripcion: string;
  /** Sube la foto nueva (si se eligió) y devuelve su ruta. Se llama después de sincronizar el perfil. */
  subirFoto?: () => Promise<string | undefined>;
}

/**
 * E4. Publica (o edita, con `id`) el negocio. Se muestran el nombre del negocio y el celular del
 * perfil para «Llamar» (mostrar_telefono). «Mis vecinos pueden verlo» es visible_vecinos: en No, el
 * negocio se guarda pero los vecinos no lo ven.
 */
export function usePublicarNegocio() {
  const cliente = useQueryClient();
  const conexion = useConexion();
  const mutacion = useMutation({
    mutationFn: async (d: DatosNegocio) => {
      const invalido = validarNombreNegocio(d.nombre);
      if (invalido) throw new Error(invalido);
      const descripcion = d.descripcion.trim();
      const problemaDescripcion = revisarTexto(descripcion, false);
      if (problemaDescripcion) throw new Error(problemaDescripcion);
      if (d.precioDesde !== null && (!Number.isFinite(d.precioDesde) || d.precioDesde < 0 || d.precioDesde > 999999)) {
        throw new Error("Revisa el precio.");
      }
      const perfil = await leerPerfilLocal();
      const contacto = perfil?.celular?.trim() || undefined;
      const comunes = {
        oficio: d.oficio,
        nombreNegocio: d.nombre.trim(),
        contacto,
        mostrarTelefono: true,
        visibleVecinos: d.visible,
        horaApertura: d.horario?.abre ?? null,
        horaCierre: d.horario?.cierra ?? null,
        precioDesde: d.precioDesde,
        descripcion: descripcion || null,
      };
      let errorFoto = null as string | null;
      const problema = await escribir(conexion !== "sin internet", async () => {
        let fotoPath: string | undefined;
        try {
          fotoPath = d.subirFoto ? await d.subirFoto() : undefined;
        } catch (causa) {
          // Sin foto se publica igual; se avisa al final.
          errorFoto = causa instanceof Error ? causa.message : "No se pudo subir la foto.";
        }
        const conFoto = fotoPath ? { ...comunes, fotoPath } : comunes;
        if (d.id) {
          await actualizarServicio(d.id, conFoto);
          return;
        }
        const ultima = await leerUltimaUbicacion();
        await crearServicio({
          ...conFoto,
          mostrarDireccion: false,
          disponibleEmergencia: false,
          lat: ultima ? redondear3(ultima.lat) : undefined,
          lng: ultima ? redondear3(ultima.lng) : undefined,
        });
      });
      if (problema) throw new Error(problema);
      return errorFoto;
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
    /** Mensaje si el negocio se publicó pero la foto no se pudo subir. */
    avisoFoto: typeof mutacion.data === "string" ? mutacion.data : null,
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
