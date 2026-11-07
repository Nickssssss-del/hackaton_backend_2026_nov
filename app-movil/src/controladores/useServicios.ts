/**
 * Controlador. Directorio público, con filtro y copia local.
 * Lee SOLO la vista servicios_publicos, ordenada por "Más recomendados primero".
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useConexion } from "./useConexion";
import { listarServiciosPublicos } from "../modelos/serviciosRepositorio";
import type { ServicioPublico } from "../modelos/tipos";
import { mensajeDeError } from "./errores";
import { distanciaMetros, minutosAPie } from "../modelos/geo";
import { leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import { leerFicha, fichaCuestaCaminar } from "../modelos/local/ficha";
import { useZona } from "./useZona";

export function useServicios() {
  const conexion = useConexion();
  const { zonaId } = useZona();
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [cuestaCaminar, setCuestaCaminar] = useState(false);
  const [copiaFecha, setCopiaFecha] = useState<string | null>(null);
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [oficio, setOficio] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // Cargar ubicación guardada y ficha al montar
  useEffect(() => {
    let activo = true;
    (async () => {
      const [ultima, ficha] = await Promise.all([leerUltimaUbicacion(), leerFicha()]);
      if (activo) {
        if (ultima) setUbicacion({ lat: ultima.lat, lng: ultima.lng });
        setCuestaCaminar(fichaCuestaCaminar(ficha));
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const consulta = useQuery({
    queryKey: ["servicios", zonaId ?? "todas"],
    queryFn: () => listarServiciosPublicos(zonaId ?? undefined),
    enabled: true,
    gcTime: 1000 * 60 * 60 * 24,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // Detectar si estamos usando copia guardada (sin internet y con datos en caché)
  useEffect(() => {
    if (conexion !== "conectado" && consulta.data && consulta.data.length > 0 && !consulta.isLoading) {
      setCopiaFecha(new Date().toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }));
    } else if (conexion === "conectado") {
      setCopiaFecha(null);
    }
  }, [conexion, consulta.data, consulta.isLoading]);

  const texto = busqueda.trim().toLowerCase();
  const servicios = (consulta.data ?? []).filter((servicio) => {
    if (soloAbiertos && !servicio.abiertoAhora) return false;
    if (oficio && servicio.oficio !== oficio) return false;
    if (!texto) return true;
    return `${servicio.nombre} ${servicio.oficio} ${servicio.descripcion ?? ""}`.toLowerCase().includes(texto);
  });

  // Orden por defecto: Más recomendados primero (vistos_buenos_300m desc, vistos_buenos_total desc, cercanía)
  const serviciosOrdenados = [...servicios].sort((a, b) => {
    // 1. Vistos buenos 300m descendente
    if (b.vistoBuenos300m !== a.vistoBuenos300m) return b.vistoBuenos300m - a.vistoBuenos300m;
    // 2. Vistos buenos total descendente
    if (b.vistoBuenoTotal !== a.vistoBuenoTotal) return b.vistoBuenoTotal - a.vistoBuenoTotal;
    // 3. Cercanía (si hay ubicación)
    if (ubicacion && a.lat !== undefined && a.lng !== undefined && b.lat !== undefined && b.lng !== undefined) {
      const da = distanciaMetros(ubicacion.lat, ubicacion.lng, a.lat, a.lng);
      const db = distanciaMetros(ubicacion.lat, ubicacion.lng, b.lat, b.lng);
      return da - db;
    }
    return 0;
  });

  // Calcular minutos a pie para cada servicio
  const serviciosConMinutos = serviciosOrdenados.map((servicio) => {
    if (ubicacion && servicio.lat !== undefined && servicio.lng !== undefined) {
      const metros = distanciaMetros(ubicacion.lat, ubicacion.lng, servicio.lat, servicio.lng);
      return { ...servicio, _minutos: minutosAPie(metros, cuestaCaminar) };
    }
    return { ...servicio, _minutos: undefined as number | undefined };
  });

  return {
    servicios: serviciosConMinutos,
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
    conexion,
    copiaFecha,
    cuestaCaminar,
    zonaId,
  };
}

export function buscarServicio(id: string, lista: ServicioPublico[]): ServicioPublico | undefined {
  return lista.find((servicio) => servicio.id === id);
}