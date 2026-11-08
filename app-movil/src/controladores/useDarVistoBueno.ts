/**
 * Controlador. Visto Bueno: mutación simple; el componente debe envolver la llamada en exigirEscritura().
 * Valida localmente votosHechos antes de llamar a la base.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { darVistoBueno } from "../modelos/serviciosRepositorio";
import type { DarVistoBuenoDTO } from "../modelos/tipos";
import { mensajeDeError, revisarTexto } from "./errores";
import { obtenerVistosHechos, guardarVistosHechos } from "../modelos/local/votosHechos";
import { useZona } from "./useZona";

export function useDarVistoBueno() {
  const cliente = useQueryClient();
  const { zonaId } = useZona();
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const mutacion = useMutation({
    mutationFn: async (dto: DarVistoBuenoDTO) => {
      const comentario = dto.comentario?.trim();
      if (comentario) {
        const invalido = revisarTexto(comentario, false);
        if (invalido) throw new Error(invalido);
      }
      // Validar localmente si ya votó
      const vistos = await obtenerVistosHechos();
      if (vistos.includes(dto.servicioId)) {
        throw new Error("VOTO_REPETIDO");
      }
      await darVistoBueno({ ...dto, comentario });
    },
    onSuccess: async (_data, dto) => {
      setListo(true);
      setError(null);
      // Guardar en votosHechos local
      const vistos = await obtenerVistosHechos();
      if (!vistos.includes(dto.servicioId)) {
        await guardarVistosHechos([...vistos, dto.servicioId]);
      }
      // Invalidar caché de servicios con la zona correcta
      await cliente.invalidateQueries({ queryKey: ["servicios", zonaId ?? "todas"] });
    },
    onError: (causa) => {
      setListo(false);
      setError(mensajeDeError(causa, "voto"));
    },
  });

  return {
    enviando: mutacion.isPending,
    error,
    listo,
    enviar: mutacion.mutateAsync, // Promise para que el componente pueda await
  };
}