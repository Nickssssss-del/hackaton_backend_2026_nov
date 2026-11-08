/**
 * Controlador. Grupos de apoyo: lista, alta, edición, borrado y verificación.
 */
import { useCallback, useEffect, useState } from "react";
import {
  borrarGrupo,
  crearGrupo,
  editarGrupo,
  listarGrupos,
  listarZonas,
  marcarVerificada,
  type DatosGrupo,
  type GrupoApoyo,
  type ZonaOpcion,
} from "../modelos/grupos";
import { mensajeDeError } from "./errores";

export function useGrupos() {
  const [grupos, setGrupos] = useState<GrupoApoyo[]>([]);
  const [zonas, setZonas] = useState<ZonaOpcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [lista, zonasLista] = await Promise.all([listarGrupos(), listarZonas()]);
      setGrupos(lista);
      setZonas(zonasLista);
    } catch (causa) {
      setError(mensajeDeError(causa, "No se pudieron leer los grupos de apoyo."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const verificar = async (id: string) => {
    setEnCurso(id);
    setError(null);
    setAviso(null);
    try {
      await marcarVerificada(id);
      setGrupos((lista) => lista.map((grupo) => (grupo.id === id ? { ...grupo, verificada: true } : grupo)));
      setAviso("Grupo marcado como verificado.");
    } catch (causa) {
      setError(mensajeDeError(causa, "No se pudo marcar el grupo como verificado."));
    } finally {
      setEnCurso(null);
    }
  };

  const ejecutar = async (marca: string, accion: () => Promise<void>, hecho: string, fallo: string) => {
    setEnCurso(marca);
    setError(null);
    setAviso(null);
    try {
      await accion();
      setGrupos(await listarGrupos());
      setAviso(hecho);
      return true;
    } catch (causa) {
      setError(mensajeDeError(causa, fallo));
      return false;
    } finally {
      setEnCurso(null);
    }
  };

  const crear = (datos: DatosGrupo) =>
    ejecutar("guardar", () => crearGrupo(datos), "Grupo creado.", "No se pudo crear el grupo.");

  const editar = (id: string, datos: DatosGrupo) =>
    ejecutar(`editar:${id}`, () => editarGrupo(id, datos), "Grupo actualizado.", "No se pudo editar el grupo.");

  const borrar = (id: string) =>
    ejecutar(`borrar:${id}`, () => borrarGrupo(id), "Grupo borrado.", "No se pudo borrar el grupo.");

  return { grupos, zonas, cargando, error, aviso, enCurso, recargar: cargar, verificar, crear, editar, borrar };
}
