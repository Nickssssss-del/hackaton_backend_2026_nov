/**
 * Controlador. Sesión del admin: entra con Supabase Auth y exige rpc('es_admin').
 * Si la cuenta no es admin, o no se puede comprobar, cierra la sesión.
 * También permite entrar en modo demo, con datos de ejemplo.
 */
import { useCallback, useEffect, useState } from "react";
import { olvidarZonas } from "../modelos/zonas";
import {
  alTerminarSesion,
  cerrarSesion,
  configurado,
  entrarConCorreo,
  entrarEnDemo,
  esAdmin,
  sesionActual,
} from "../modelos/sesion";
import { enDemo, problemaConfiguracion } from "../modelos/supabase";
import { mensajeDeError } from "./errores";

export type EstadoSesion = "cargando" | "fuera" | "admin";

const NO_ADMIN = "Esta cuenta no es administradora del barrio. Se cerró la sesión.";
const SIN_COMPROBAR = "No se pudo comprobar el permiso de administrador. Se cerró la sesión.";

export function useSesion() {
  const [estado, setEstado] = useState<EstadoSesion>("cargando");
  const [correo, setCorreo] = useState<string | null>(null);
  const [demo, setDemo] = useState(enDemo());
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(
    problemaConfiguracion && problemaConfiguracion !== "FALTA_CONFIGURACION" ? mensajeDeError(new Error(problemaConfiguracion), "") : null,
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
      setDemo(enDemo());
      setEstado("admin");
      return;
    }
    await cerrarSesion().catch(() => undefined);
    setCorreo(null);
    setError(mensaje);
    setEstado("fuera");
  }, []);

  useEffect(() => {
    let vigente = true;
    sesionActual()
      .then((sesion) => {
        if (!vigente) return;
        if (sesion) return exigirAdmin(sesion.correo);
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
    if (!configurado) {
      setError(mensajeDeError(new Error(problemaConfiguracion ?? "FALTA_CONFIGURACION"), ""));
      return;
    }
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

  /** Demo: `admin = false` muestra lo que ve una cuenta sin permiso. */
  const entrarDemo = (admin: boolean) => {
    const sesion = entrarEnDemo(admin);
    if (!sesion) {
      setError(NO_ADMIN);
      return;
    }
    setError(null);
    setCorreo(sesion.correo);
    setDemo(true);
    setEstado("admin");
  };

  const salir = async () => {
    await cerrarSesion().catch(() => undefined);
    olvidarZonas();
    setCorreo(null);
    setError(null);
    setDemo(false);
    setEstado("fuera");
  };

  return { estado, correo, demo, enviando, error, configurado, entrar, entrarDemo, salir };
}
