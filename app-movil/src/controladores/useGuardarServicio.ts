/**
 * Controlador. Publica (insert) o edita (update) un servicio con exigirEscritura.
 * Contacto = celular del perfil; lat/lng = última ubicación con redondear3 o null.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { exigirEscritura } from "./guarda";
import { crearServicio, actualizarServicio } from "../modelos/serviciosRepositorio";
import type { CrearServicioDTO } from "../modelos/tipos";
import { mensajeDeError, revisarTexto } from "./errores";
import { leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import { redondear3 } from "../modelos/geo";
import { usePerfil } from "./usePerfil";
import { useConexion } from "./useConexion";

export function useGuardarServicio() {
  const cliente = useQueryClient();
  const { perfil } = usePerfil();
  const conexion = useConexion();
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const mutacion = useMutation({
    mutationFn: async ({ dto, id }: { dto: CrearServicioDTO; id?: string }) => {
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

      // Leer última ubicación guardada (solo para insert; en update no se envía lat/lng si no cambian)
      let lat = dto.lat;
      let lng = dto.lng;
      if (!id && (lat === undefined || lng === undefined)) {
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
          const payload = {
            ...dto,
            lat: lat === undefined ? undefined : lat,
            lng: lng === undefined ? undefined : lng,
            contacto: perfil?.celular ?? undefined,
          };
          if (id) {
            await actualizarServicio(id, payload);
          } else {
            await crearServicio(payload);
          }
        },
      });

      if (!ok) {
        throw new Error("No se pudo guardar");
      }
    },
    onSuccess: async () => {
      setListo(true);
      setError(null);
      await cliente.invalidateQueries({ queryKey: ["servicios"] });
      await cliente.invalidateQueries({ queryKey: ["mis-servicios"] });
    },
    onError: (causa) => setError(mensajeDeError(causa, "general")),
  });

  return { enviando: mutacion.isPending, error, listo, guardar: mutacion.mutate };
}