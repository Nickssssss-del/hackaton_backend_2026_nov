/**
 * Controlador. Grupos de apoyo y la acción "Marcar como verificada".
 */
import { useCallback, useEffect, useState } from "react";
import { listarGrupos, marcarVerificada, type GrupoApoyo } from "../modelos/grupos";
import { mensajeDeError } from "./errores";

export function useGrupos() {
  const [grupos, setGrupos] = useState<GrupoApoyo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setGrupos(await listarGrupos());
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

  return { grupos, cargando, error, aviso, enCurso, recargar: cargar, verificar };
}
