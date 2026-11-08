/**
 * Controlador. Confirmar el celular con un código (SMS de Supabase Auth) y el interruptor
 * «Vecinos cerca me ven si pido ayuda» (perfiles.alerta_vecinal). Las vistas no importan Supabase.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  confirmarCodigoCelular,
  enviarCodigoCelular,
  guardarAlertaVecinal,
  leerEstadoCuenta,
  sincronizarVerificacion,
} from "../modelos/cuentaRepositorio";
import { guardarPerfilLocal, leerPerfilLocal } from "../modelos/local/perfil";
import { guardarPerfilNube } from "../modelos/perfilRepositorio";
import { asegurarSesionAnonima, tieneConfiguracionSupabase } from "../modelos/supabase";
import { mensajeDeError } from "./errores";
import { useConexion } from "./useConexion";
import { validarCelular } from "./useAyudaVecinos";

const CLAVE_ESTADO = ["estado-cuenta"];

/** ¿El celular del perfil ya está confirmado? Se consulta a la base (estado_cuenta). */
export function useEstadoCuenta() {
  const consulta = useQuery({
    queryKey: CLAVE_ESTADO,
    queryFn: async () => {
      await asegurarSesionAnonima();
      return leerEstadoCuenta();
    },
    enabled: tieneConfiguracionSupabase(),
    staleTime: 1000 * 60,
    retry: 1,
  });
  return {
    celularVerificado: consulta.data?.celularVerificado ?? false,
    cargando: consulta.isLoading,
    recargar: () => void consulta.refetch(),
  };
}

export type PasoVerificacion = "celular" | "codigo" | "listo";

/**
 * Flujo de 2 pasos: 1) celular (se guarda en el teléfono y en perfiles.celular) y envío del código;
 * 2) código de 6 números. Al confirmar se sincroniza perfiles.celular_verificado.
 */
export function useVerificarCelular() {
  const cliente = useQueryClient();
  const conexion = useConexion();
  const [paso, setPaso] = useState<PasoVerificacion>("celular");
  const [celular, setCelular] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarCelular = useCallback(async () => {
    const perfil = await leerPerfilLocal();
    if (perfil?.celular) setCelular(perfil.celular);
  }, []);

  const enviarCodigo = useCallback(async () => {
    setError(null);
    const invalido = validarCelular(celular);
    if (invalido) {
      setError(invalido);
      return;
    }
    if (!tieneConfiguracionSupabase()) {
      setError("Esta copia de la app no está conectada al servidor. Pídele al equipo el archivo .env.");
      return;
    }
    if (conexion === "sin internet") {
      setError("Necesitas internet para recibir el código.");
      return;
    }
    setOcupado(true);
    try {
      const limpio = celular.replace(/\D/g, "");
      const perfil = (await leerPerfilLocal()) ?? {};
      await guardarPerfilLocal({ ...perfil, celular: limpio });
      await asegurarSesionAnonima();
      // perfiles.celular debe coincidir con el teléfono confirmado ('51' + celular).
      await guardarPerfilNube({ ...perfil, celular: limpio });
      await enviarCodigoCelular(limpio);
      setPaso("codigo");
    } catch (causa) {
      setError(mensajeVerificacion(causa));
    } finally {
      setOcupado(false);
    }
  }, [celular, conexion]);

  const confirmar = useCallback(
    async (codigo: string) => {
      setError(null);
      if (!/^\d{6}$/.test(codigo.replace(/\D/g, ""))) {
        setError("El código tiene 6 números.");
        return;
      }
      setOcupado(true);
      try {
        const ok = await confirmarCodigoCelular(celular, codigo);
        if (!ok) {
          setError("Se confirmó el código, pero el celular no coincide con el de tus datos. Revisa el número.");
          return;
        }
        await cliente.invalidateQueries({ queryKey: CLAVE_ESTADO });
        setPaso("listo");
      } catch (causa) {
        setError(mensajeVerificacion(causa));
      } finally {
        setOcupado(false);
      }
    },
    [celular, cliente],
  );

  /** Si el teléfono ya estaba confirmado en Auth (otra vez), solo sincroniza el perfil. */
  const yaConfirmado = useCallback(async () => {
    try {
      const ok = await sincronizarVerificacion();
      if (ok) {
        await cliente.invalidateQueries({ queryKey: CLAVE_ESTADO });
        setPaso("listo");
      }
      return ok;
    } catch {
      return false;
    }
  }, [cliente]);

  return {
    paso,
    setPaso,
    celular,
    setCelular,
    cargarCelular,
    enviarCodigo,
    confirmar,
    yaConfirmado,
    ocupado,
    error,
  };
}

/** Guarda el interruptor en el perfil de la nube. Devuelve un mensaje si no se pudo (null si salió bien). */
export async function sincronizarAlertaVecinal(activar: boolean): Promise<string | null> {
  if (!tieneConfiguracionSupabase()) return null;
  try {
    await asegurarSesionAnonima();
    // Actualiza solo la columna. Si el perfil todavía no existe en la nube, el próximo
    // guardarPerfilNube la envía desde la preferencia guardada en el teléfono.
    await guardarAlertaVecinal(activar);
    return null;
  } catch (causa) {
    return mensajeDeError(causa, "general");
  }
}

function mensajeVerificacion(causa: unknown): string {
  const texto = causa instanceof Error ? causa.message : String((causa as { message?: unknown })?.message ?? "");
  if (/token has expired|invalid|otp/i.test(texto)) return "El código no es correcto o ya venció. Pide otro.";
  if (/rate limit|too many|seconds/i.test(texto)) return "Espera un minuto antes de pedir otro código.";
  if (/phone.*(provider|disabled)|sms/i.test(texto)) return "Los mensajes de texto todavía no están activos. Avisa al equipo.";
  if (/already.*(registered|exists)|phone_exists/i.test(texto)) return "Ese celular ya está en otra cuenta.";
  return mensajeDeError(causa, "general");
}
