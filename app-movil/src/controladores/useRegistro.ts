import { useCallback, useEffect, useState } from "react";
import { useConexion } from "./useConexion";
import { usePerfil } from "./usePerfil";
import { guardarPerfilNube } from "../modelos/perfilRepositorio";
import { asegurarSesionAnonima, tieneConfiguracionSupabase } from "../modelos/supabase";
import { guardarPerfilLocal, leerPerfilLocal } from "../modelos/local/perfil";
import { guardarContactosLocales } from "../modelos/local/contactos";
import { guardarFicha } from "../modelos/local/ficha";
import { guardarJson } from "../modelos/almacen";
import { borrarMisDatos } from "../modelos/supabase";
import type { ContactoLocal, FichaEmergencia, PerfilLocal } from "../modelos/tipos";

export function useRegistro() {
  const [perfil, setPerfil] = useState<PerfilLocal | null>(null);
  const [ficha, setFicha] = useState<FichaEmergencia | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const conexion = useConexion();
  const perfilActual = usePerfil();

  useEffect(() => {
    let activo = true;
    void leerPerfilLocal().then((guardado) => {
      if (activo) {
        setPerfil(guardado);
        setListo(true);
      }
    });
    return () => {
      activo = false;
    };
  }, []);

  const guardarPaso = useCallback(async (cambios: Partial<PerfilLocal>) => {
    const siguiente = { ...(perfil ?? {}), ...cambios };
    await guardarPerfilLocal(siguiente);
    setPerfil(siguiente);
    return siguiente;
  }, [perfil]);

  const sincronizarPerfil = useCallback(async (siguiente: PerfilLocal) => {
    if (conexion !== "conectado" || !tieneConfiguracionSupabase()) return;
    await asegurarSesionAnonima();
    await guardarPerfilNube(siguiente);
  }, [conexion]);

  const guardarContactos = useCallback(async (contactos: ContactoLocal[]) => {
    await guardarContactosLocales(contactos);
  }, []);

  const guardarFichaLocal = useCallback(async (siguiente: FichaEmergencia) => {
    await guardarFicha(siguiente);
    setFicha(siguiente);
  }, []);

  const finalizar = useCallback(async () => {
    const siguiente = await leerPerfilLocal();
    if (siguiente) {
      await sincronizarPerfil(siguiente);
    }
    await guardarJson("registro_omitido", false);
  }, [sincronizarPerfil]);

  const saltar = useCallback(async () => {
    await guardarJson("registro_omitido", true);
  }, []);

  const borrar = useCallback(async () => {
    setEnviando(true);
    try {
      await borrarMisDatos();
      await guardarPerfilLocal({});
      setPerfil(null);
    } finally {
      setEnviando(false);
    }
  }, []);

  return {
    perfil,
    ficha,
    listo,
    error,
    enviando,
    setError,
    guardarPaso,
    guardarContactos,
    guardarFicha: guardarFichaLocal,
    finalizar,
    saltar,
    borrar,
    perfilCompleto: perfilActual.completo,
  };
}
