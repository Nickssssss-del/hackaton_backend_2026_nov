import { useCallback } from "react";
import { exigirInternet } from "./red";
import { mensajeDeError } from "./errores";
import { reportarServicio } from "../modelos/serviciosRepositorio";
import type { MotivoReporte } from "../modelos/tipos";

export function useReportarServicio() {
  return useCallback(async (servicioId: string, motivo: MotivoReporte) => {
    try {
      await exigirInternet();
      await reportarServicio(servicioId, motivo);
      return { mensaje: "Recibimos tu reporte.", error: null };
    } catch (causa) {
      return { mensaje: null, error: mensajeDeError(causa, "reporte") };
    }
  }, []);
}
