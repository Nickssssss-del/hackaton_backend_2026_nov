/**
 * Controlador. Carga los grupos públicos. No revisa reportes.
 */
import { useEffect, useState } from "react";
import { listarGrupos, type GrupoPublico } from "../modelos/grupos";

export function useGrupos() {
  const [grupos, setGrupos] = useState<GrupoPublico[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarGrupos().then(setGrupos).catch(() => setError("No se pudieron leer los grupos."));
  }, []);

  return { grupos, error };
}
