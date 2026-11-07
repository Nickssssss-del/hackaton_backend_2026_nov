/**
 * Controlador. Publica un servicio con la ubicación del teléfono.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useState } from "react";
import { perfilEstaCompleto } from "../modelos/perfilRepositorio";
import { crearServicio } from "../modelos/serviciosRepositorio";
import type { CrearServicioDTO } from "../modelos/tipos";
import { mensajeDeError, revisarTexto } from "./errores";
import { exigirInternet } from "./red";

export function usePublicarServicio() {
  const cliente = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const mutacion = useMutation({
    mutationFn: async (dto: CrearServicioDTO) => {
      if (dto.descripcion) {
        const invalido = revisarTexto(dto.descripcion, false);
        if (invalido) throw new Error(invalido);
      }
      if (dto.contacto && !/^9\d{8}$/.test(dto.contacto)) {
        throw new Error("El celular son 9 dígitos y empieza en 9.");
      }
      await exigirInternet();
      if (!(await perfilEstaCompleto())) throw new Error("PERFIL_INCOMPLETO");
      let lat = dto.lat;
      let lng = dto.lng;
      if (lat === undefined || lng === undefined) {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (permiso.granted) {
          const punto = await Location.getCurrentPositionAsync({});
          lat = Number(punto.coords.latitude.toFixed(3));
          lng = Number(punto.coords.longitude.toFixed(3));
        }
      }
      await crearServicio({ ...dto, lat, lng });
    },
    onSuccess: async () => {
      setListo(true);
      setError(null);
      await cliente.invalidateQueries({ queryKey: ["servicios-publicos"] });
    },
    onError: (causa) => setError(mensajeSimple(causa)),
  });

  return { enviando: mutacion.isPending, error, listo, publicar: mutacion.mutate };
}

function mensajeSimple(causa: unknown): string {
  if (causa instanceof Error && !causa.message.includes("_") && causa.message.length < 90) {
    return causa.message;
  }
  return mensajeDeError(causa, "general");
}
