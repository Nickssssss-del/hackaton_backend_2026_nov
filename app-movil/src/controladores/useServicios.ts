/**
 * Controlador. Directorio público, con filtro y copia local.
 */
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { listarServiciosPublicos } from "../modelos/serviciosRepositorio";
import type { ServicioPublico } from "../modelos/tipos";
import { mensajeDeError } from "./errores";

export function useServicios() {
  const consulta = useQuery({
    queryKey: ["servicios-publicos"],
    queryFn: listarServiciosPublicos,
  });
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [oficio, setOficio] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) return;
      const punto = await Location.getCurrentPositionAsync({});
      if (activo) setUbicacion({ lat: punto.coords.latitude, lng: punto.coords.longitude });
    })();
    return () => {
      activo = false;
    };
  }, []);

  const texto = busqueda.trim().toLowerCase();
  const servicios = (consulta.data ?? []).filter((servicio) => {
    if (soloAbiertos && !servicio.abiertoAhora) return false;
    if (oficio && servicio.oficio !== oficio) return false;
    if (!texto) return true;
    return `${servicio.nombre} ${servicio.oficio} ${servicio.descripcion}`.toLowerCase().includes(texto);
  });

  return {
    servicios,
    todos: consulta.data ?? [],
    cargando: consulta.isLoading,
    error: consulta.error ? mensajeDeError(consulta.error, "general") : null,
    recargar: () => consulta.refetch(),
    soloAbiertos,
    setSoloAbiertos,
    oficio,
    setOficio,
    busqueda,
    setBusqueda,
    ubicacion,
  };
}

export function buscarServicio(id: string, lista: ServicioPublico[]): ServicioPublico | undefined {
  return lista.find((servicio) => servicio.id === id);
}
