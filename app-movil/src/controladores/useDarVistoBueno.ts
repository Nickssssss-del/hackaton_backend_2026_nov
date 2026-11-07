/**
 * Controlador. Exige internet y perfil completo antes de votar.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { perfilEstaCompleto } from "../modelos/perfilRepositorio";
import { darVistoBueno } from "../modelos/serviciosRepositorio";
import type { DarVistoBuenoDTO } from "../modelos/tipos";
import { mensajeDeError, revisarTexto } from "./errores";
import { exigirInternet } from "./red";

export function useDarVistoBueno() {
  const cliente = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const mutacion = useMutation({
    mutationFn: async (dto: DarVistoBuenoDTO) => {
      const comentario = dto.comentario?.trim();
      if (comentario) {
        const invalido = revisarTexto(comentario, false);
        if (invalido) throw new Error(invalido);
      }
      await exigirInternet();
      if (!(await perfilEstaCompleto())) throw new Error("PERFIL_INCOMPLETO");
      await darVistoBueno({ ...dto, comentario });
    },
    onSuccess: async () => {
      setListo(true);
      setError(null);
      await cliente.invalidateQueries({ queryKey: ["servicios-publicos"] });
    },
    onError: (causa) => {
      setListo(false);
      setError(causa instanceof Error && !causa.message.includes("_") && causa.message.length < 80
        ? causa.message
        : mensajeDeError(causa));
    },
  });

  return {
    enviando: mutacion.isPending,
    error,
    listo,
    enviar: (dto: DarVistoBuenoDTO) => mutacion.mutate(dto),
  };
}
