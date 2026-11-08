import { useCallback, useEffect, useState } from "react";
import { useConexion } from "./useConexion";
import { asegurarSesionAnonima, tieneConfiguracionSupabase } from "../modelos/supabase";
import { guardarPerfilNube } from "../modelos/perfilRepositorio";
import { guardarPerfilLocal, leerPerfilLocal } from "../modelos/local/perfil";
import type { PerfilLocal } from "../modelos/tipos";

export function perfilCompleto(perfil: PerfilLocal | null): boolean {
  return Boolean(
    perfil?.nombre &&
      perfil.nombre.trim().length >= 2 &&
      /^9\d{8}$/.test(perfil.celular?.trim() ?? "") &&
      perfil.zonaId,
  );
}

export function usePerfil() {
  const [perfil, setPerfil] = useState<PerfilLocal | null>(null);
  const [cargando, setCargando] = useState(true);
  const conexion = useConexion();

  useEffect(() => {
    let activo = true;
    void leerPerfilLocal().then((guardado) => {
      if (activo) {
        setPerfil(guardado);
        setCargando(false);
      }
    });
    return () => {
      activo = false;
    };
  }, []);

  const guardar = useCallback(async (siguiente: PerfilLocal) => {
    await guardarPerfilLocal(siguiente);
    setPerfil(siguiente);
  }, []);

  const asegurarPerfilEnNube = useCallback(async () => {
    const actual = perfil;
    if (!actual || !perfilCompleto(actual) || conexion !== "conectado" || !tieneConfiguracionSupabase()) return false;
    await asegurarSesionAnonima();
    await guardarPerfilNube(actual);
    return true;
  }, [conexion, perfil]);

  return { perfil, cargando, guardar, asegurarPerfilEnNube, completo: perfilCompleto(perfil) };
}
