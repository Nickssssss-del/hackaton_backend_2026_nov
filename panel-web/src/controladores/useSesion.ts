/**
 * Controlador. Sesión del admin: entra con Supabase Auth y exige rpc('es_admin').
 * Si la cuenta no es admin, o no se puede comprobar, cierra la sesión.
 */
import { useCallback, useEffect, useState } from "react";
import {
  alTerminarSesion,
  cerrarSesion,
  configurado,
  entrarConCorreo,
  esAdmin,
  sesionActual,
} from "../modelos/sesion";
import { mensajeDeError } from "./errores";

export type EstadoSesion = "cargando" | "fuera" | "admin";

/** Minutos sin clics, teclas ni scroll antes de cerrar la sesión del admin. */
export const MINUTOS_INACTIVIDAD = 15;
const CADA_MS = 15_000;
const EVENTOS_DE_ACTIVIDAD = ["click", "keydown", "scroll"] as const;

const NO_ADMIN = "Esta cuenta no es administradora del barrio. Se cerró la sesión.";
const SIN_COMPROBAR = "No se pudo comprobar el permiso de administrador. Se cerró la sesión.";
const INACTIVIDAD = "Tu sesión se cerró por inactividad.";

export function useSesion() {
  const [estado, setEstado] = useState<EstadoSesion>(configurado ? "cargando" : "fuera");
  const [correo, setCorreo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(
    configurado ? null : mensajeDeError(new Error("FALTA_CONFIGURACION"), ""),
  );

  /** Falla cerrado: sin un sí explícito de es_admin, no hay panel. */
  const exigirAdmin = useCallback(async (correoSesion: string | null) => {
    let admin = false;
    let mensaje = NO_ADMIN;
    try {
      admin = await esAdmin();
    } catch (causa) {
      mensaje = mensajeDeError(causa, SIN_COMPROBAR);
    }
    if (admin) {
      setCorreo(correoSesion);
      setError(null);
      setEstado("admin");
      return;
    }
    await cerrarSesion().catch(() => undefined);
    setCorreo(null);
    setError(mensaje);
    setEstado("fuera");
  }, []);

  useEffect(() => {
    if (!configurado) return;
    let vigente = true;
    sesionActual()
      .then((sesion) => {
        if (!vigente) return;
        if (sesion) return exigirAdmin(sesion.user.email ?? null);
        setEstado("fuera");
      })
      .catch((causa) => {
        if (!vigente) return;
        setError(mensajeDeError(causa, "No se pudo leer la sesión."));
        setEstado("fuera");
      });
    const dejar = alTerminarSesion(() => {
      setCorreo(null);
      setEstado("fuera");
    });
    return () => {
      vigente = false;
      dejar();
    };
  }, [exigirAdmin]);

  // Cierre por inactividad: se guarda la hora de la última actividad y se revisa cada 15 s y al volver
  // a la pestaña. Así funciona aunque el equipo se suspenda y un temporizador llegue tarde.
  useEffect(() => {
    if (estado !== "admin") return;
    let ultima = Date.now();
    const marcar = () => {
      ultima = Date.now();
    };
    const opciones = { capture: true, passive: true };

    const dejarDeVigilar = () => {
      for (const evento of EVENTOS_DE_ACTIVIDAD) window.removeEventListener(evento, marcar, opciones);
      document.removeEventListener("visibilitychange", revisar);
      clearInterval(reloj);
    };

    function revisar() {
      if (Date.now() - ultima < MINUTOS_INACTIVIDAD * 60_000) return;
      dejarDeVigilar();
      void cerrarSesion()
        .catch(() => undefined)
        .finally(() => {
          setCorreo(null);
          setError(INACTIVIDAD);
          setEstado("fuera");
        });
    }

    // capture: también cuenta el scroll de listas internas, no solo el de la página.
    for (const evento of EVENTOS_DE_ACTIVIDAD) window.addEventListener(evento, marcar, opciones);
    document.addEventListener("visibilitychange", revisar);
    const reloj = setInterval(revisar, CADA_MS);
    return dejarDeVigilar;
  }, [estado]);

  const entrar = async (correoIngresado: string, clave: string) => {
    if (!correoIngresado.trim() || !clave) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const sesion = await entrarConCorreo(correoIngresado, clave);
      await exigirAdmin(sesion.user.email ?? null);
    } catch (causa) {
      const detalle = causa instanceof Error ? causa.message : "";
      setError(
        /invalid login credentials|invalid_credentials/i.test(detalle)
          ? "Correo o contraseña incorrectos."
          : mensajeDeError(causa, "No se pudo entrar. Inténtalo otra vez."),
      );
    } finally {
      setEnviando(false);
    }
  };

  const salir = async () => {
    await cerrarSesion().catch(() => undefined);
    setCorreo(null);
    setError(null);
    setEstado("fuera");
  };

  return { estado, correo, enviando, error, entrar, salir };
}
