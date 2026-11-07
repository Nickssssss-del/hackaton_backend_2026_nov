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

const NO_ADMIN = "Esta cuenta no es administradora del barrio. Se cerró la sesión.";
const SIN_COMPROBAR = "No se pudo comprobar el permiso de administrador. Se cerró la sesión.";

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
