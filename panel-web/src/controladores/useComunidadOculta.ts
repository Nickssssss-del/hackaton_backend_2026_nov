/**
 * Controlador. Publicaciones y comentarios ocultos: "Volver a mostrar", "Borrar" y "Bloquear al autor".
 */
import { useCallback, useEffect, useState } from "react";
import { bloquear, listarIdsBloqueados } from "../modelos/bloqueos";
import {
  borrarContenido,
  listarComentariosOcultos,
  listarPublicacionesOcultas,
  volverAMostrar,
  type ComentarioOculto,
  type PublicacionOculta,
  type TablaComunidad,
} from "../modelos/comunidadOculta";
import { mensajeDeError } from "./errores";

export function useComunidadOculta() {
  const [publicaciones, setPublicaciones] = useState<PublicacionOculta[]>([]);
  const [comentarios, setComentarios] = useState<ComentarioOculto[]>([]);
  const [bloqueados, setBloqueados] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [pubs, coms, ids] = await Promise.all([
        listarPublicacionesOcultas(),
        listarComentariosOcultos(),
        listarIdsBloqueados(),
      ]);
      setPublicaciones(pubs);
      setComentarios(coms);
      setBloqueados(ids);
    } catch (causa) {
      setError(mensajeDeError(causa, "No se pudo leer el contenido oculto."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const quitar = (tabla: TablaComunidad, id: string) => {
    if (tabla === "publicaciones") setPublicaciones((lista) => lista.filter((p) => p.id !== id));
    else setComentarios((lista) => lista.filter((c) => c.id !== id));
  };

  const ejecutar = async (id: string, accion: () => Promise<void>, hecho: string, fallo: string) => {
    setEnCurso(id);
    setError(null);
    setAviso(null);
    try {
      await accion();
      setAviso(hecho);
      return true;
    } catch (causa) {
      setError(mensajeDeError(causa, fallo));
      return false;
    } finally {
      setEnCurso(null);
    }
  };

  const mostrar = async (tabla: TablaComunidad, id: string) => {
    if (await ejecutar(id, () => volverAMostrar(tabla, id), "Vuelve a verse en la app.", "No se pudo volver a mostrar.")) {
      quitar(tabla, id);
    }
  };

  const borrar = async (tabla: TablaComunidad, id: string) => {
    let fotoSinBorrar = false;
    const accion = async () => {
      ({ fotoSinBorrar } = await borrarContenido(tabla, id));
    };
    if (await ejecutar(id, accion, "Borrado junto con sus reportes.", "No se pudo borrar.")) {
      quitar(tabla, id);
      // La fila ya se borró; solo se avisa que la foto quedó en Storage.
      if (fotoSinBorrar) setAviso("Borrado junto con sus reportes, pero su foto no se pudo borrar. Quítala desde Storage (bucket fotos).");
    }
  };

  /** Devuelve true si quedó bloqueado (también si ya lo estaba). */
  const bloquearAutor = async (autor: string, motivo: string) => {
    const hecho = await ejecutar(autor, () => bloquear(autor, motivo), "Autor bloqueado.", "No se pudo bloquear.");
    if (hecho) setBloqueados((ids) => new Set(ids).add(autor));
    return hecho;
  };

  return {
    publicaciones,
    comentarios,
    bloqueados,
    cargando,
    error,
    aviso,
    enCurso,
    recargar: cargar,
    mostrar,
    borrar,
    bloquearAutor,
  };
}
