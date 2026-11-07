/**
 * Controlador. Abre la sesión anónima y guarda el perfil en el teléfono.
 * El celular de 9 dígitos completa el perfil. Proteger la cuenta queda fuera del MVP.
 */
import { useEffect, useState } from "react";
import { guardarPerfilLocal, leerPerfilLocal } from "../modelos/perfilLocal";
import { borrarMisDatos, guardarPerfilNube, listarZonas } from "../modelos/perfilRepositorio";
import { asegurarSesionAnonima } from "../modelos/supabase";
import type { PerfilLocal, ZonaPublica } from "../modelos/tipos";
import { mensajeDeError } from "./errores";

export function useRegistro() {
  const [perfil, setPerfil] = useState<PerfilLocal | null>(null);
  const [listo, setListo] = useState(false);
  const [zonas, setZonas] = useState<ZonaPublica[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        await asegurarSesionAnonima();
        const [guardado, lista] = await Promise.all([leerPerfilLocal(), listarZonas()]);
        if (!activo) return;
        setPerfil(guardado);
        setZonas(lista);
      } catch (causa) {
        if (activo) setError(mensajeDeError(causa));
      } finally {
        if (activo) setListo(true);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const guardar = async (siguiente: PerfilLocal) => {
    setEnviando(true);
    setError(null);
    try {
      const celular = siguiente.celular?.trim() ?? "";
      if (celular && !/^9\d{8}$/.test(celular)) {
        setError("El celular son 9 dígitos y empieza en 9.");
        return;
      }
      await guardarPerfilNube(siguiente);
      await guardarPerfilLocal(siguiente);
      setPerfil(siguiente);
    } catch (causa) {
      setError(mensajeDeError(causa));
    } finally {
      setEnviando(false);
    }
  };

  const borrar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await borrarMisDatos();
      await guardarPerfilLocal({});
      setPerfil(null);
    } catch (causa) {
      setError(mensajeDeError(causa));
    } finally {
      setEnviando(false);
    }
  };

  return { perfil, zonas, listo, enviando, error, guardar, borrar };
}
