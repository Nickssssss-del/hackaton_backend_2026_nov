/**
 * Controlador. Publica un servicio en 3 toques con exigirEscritura.
 * Contacto = celular del perfil; lat/lng = última ubicación con redondear3 o null.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { exigirEscritura } from "./guarda";
import { crearServicio } from "../modelos/serviciosRepositorio";
import type { CrearServicioDTO } from "../modelos/tipos";
import { mensajeDeError, revisarTexto } from "./errores";
import { leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import { redondear3 } from "../modelos/geo";
import { perfilCompleto, usePerfil } from "./usePerfil";
import { useConexion } from "./useConexion";

export function usePublicarServicio() {
  const cliente = useQueryClient();
  const { perfil } = usePerfil();
  const conexion = useConexion();
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const mutacion = useMutation({
    mutationFn: async (dto: CrearServicioDTO) => {
      // Validaciones locales
      if (dto.descripcion) {
        const invalido = revisarTexto(dto.descripcion, false);
        if (invalido) throw new Error(invalido);
      }
      if (dto.nombreNegocio) {
        const invalido = revisarTexto(dto.nombreNegocio, false);
        if (invalido) throw new Error(invalido);
      }
      if (dto.direccion) {
        const invalido = revisarTexto(dto.direccion, false);
        if (invalido) throw new Error(invalido);
      }

      // Leer última ubicación guardada
      let lat = dto.lat;
      let lng = dto.lng;
      if (lat === undefined || lng === undefined) {
        const ultima = await leerUltimaUbicacion();
        if (ultima) {
          lat = redondear3(ultima.lat);
          lng = redondear3(ultima.lng);
        }
      }

      // exigirEscritura: perfil completo + internet real + sesión + escritura
      const ok = await exigirEscritura({
        perfil,
        internetReal: conexion === "conectado",
        irAlRegistro: () => {},
        avisar: (mensaje) => { throw new Error(mensaje); },
        ejecutar: async () => {
          await crearServicio({
            ...dto,
            lat,
            lng,
            contacto: perfil?.celular ?? undefined,
          });
        },
      });

      if (!ok) {
        throw new Error("No se pudo publicar");
      }
    },
    onSuccess: async () => {
      setListo(true);
      setError(null);
      await cliente.invalidateQueries({ queryKey: ["servicios"] });
    },
    onError: (causa) => setError(mensajeDeError(causa, "general")),
  });

  return { enviando: mutacion.isPending, error, listo, publicar: mutacion.mutate };
}