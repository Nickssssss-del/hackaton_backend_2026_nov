/**
 * Controlador. Reportar: mutación simple; el componente debe envolver la llamada en exigirEscritura().
 */
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { reportarServicio } from "../modelos/serviciosRepositorio";
import type { MotivoReporte } from "../modelos/tipos";
import { mensajeDeError } from "./errores";

export function useReportarServicio() {
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const mutacion = useMutation({
    mutationFn: async ({ servicioId, motivo }: { servicioId: string; motivo: MotivoReporte }) => {
      await reportarServicio(servicioId, motivo);
    },
    onSuccess: () => {
      setMensaje("Recibimos tu reporte.");
      setError(null);
    },
    onError: (causa) => {
      setError(mensajeDeError(causa, "reporte"));
      setMensaje(null);
    },
  });

  return {
    enviando: mutacion.isPending,
    error,
    mensaje,
    reportar: mutacion.mutateAsync,
  };
}