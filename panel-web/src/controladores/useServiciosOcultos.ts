/**
 * Controlador. Lista de servicios ocultos con sus reportes, y las acciones
 * "Volver a mostrar" y "Borrar".
 */
import { useCallback, useEffect, useState } from "react";
import {
  borrarServicio,
  listarServiciosOcultos,
  volverAMostrar,
  type ServicioOculto,
} from "../modelos/serviciosOcultos";
import { mensajeDeError } from "./errores";

export function useServiciosOcultos() {
  const [servicios, setServicios] = useState<ServicioOculto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setServicios(await listarServiciosOcultos());
    } catch (causa) {
      setError(mensajeDeError(causa, "No se pudieron leer los servicios ocultos."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** La acción devuelve el aviso a mostrar si salió bien. */
  const ejecutar = async (id: string, accion: (id: string) => Promise<string>, fallo: string) => {
    setEnCurso(id);
    setError(null);
    setAviso(null);
    try {
      const hecho = await accion(id);
      setServicios((lista) => lista.filter((servicio) => servicio.id !== id));
      setAviso(hecho);
    } catch (causa) {
      setError(mensajeDeError(causa, fallo));
    } finally {
      setEnCurso(null);
    }
  };

  const mostrar = (id: string) =>
    ejecutar(
      id,
      async (servicio) => {
        await volverAMostrar(servicio);
        return "El servicio vuelve a verse en la app.";
      },
      "No se pudo volver a mostrar el servicio.",
    );

  const borrar = (id: string) =>
    ejecutar(
      id,
      async (servicio) => {
        const { fotoSinBorrar } = await borrarServicio(servicio);
        return fotoSinBorrar
          ? "Servicio borrado, pero su foto no se pudo borrar. Quítala desde Storage (bucket fotos)."
          : "Servicio borrado junto con sus reportes y vistos buenos.";
      },
      "No se pudo borrar el servicio.",
    );

  return { servicios, cargando, error, aviso, enCurso, recargar: cargar, mostrar, borrar };
}
