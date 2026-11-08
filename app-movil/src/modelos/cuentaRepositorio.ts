/**
 * Modelo. Cuenta propia: borrar mis datos y confirmar el celular con un código por SMS.
 *
 * El backend (script 07) exige celular verificado para ofrecer ayuda (yo_ayudo) y para ver o
 * responder una alerta vecinal (ver_alerta, voy_a_ayudar). La verificación usa Supabase Auth con
 * teléfono (Twilio, ver backend/docs/configuracion.md):
 * 1. updateUser({ phone }) enlaza el teléfono a la cuenta anónima y envía el código.
 * 2. verifyOtp({ type: "phone_change" }) confirma el código.
 * 3. sincronizar_verificacion() copia la confirmación a perfiles.celular_verificado si el teléfono
 *    confirmado coincide con perfiles.celular ('51' + celular).
 */
import { obtenerSupabase } from "./supabase";

export async function borrarMisDatos(): Promise<void> {
  const { error } = await obtenerSupabase().rpc("borrar_mis_datos");
  if (error) throw error;
}

/** Celular peruano de 9 dígitos → formato internacional que usa Supabase Auth. */
export function telefonoInternacional(celular: string): string {
  return `+51${celular.replace(/\D/g, "")}`;
}

export async function enviarCodigoCelular(celular: string): Promise<void> {
  const { error } = await obtenerSupabase().auth.updateUser({ phone: telefonoInternacional(celular) });
  if (error) throw error;
}

export async function confirmarCodigoCelular(celular: string, codigo: string): Promise<boolean> {
  const { error } = await obtenerSupabase().auth.verifyOtp({
    phone: telefonoInternacional(celular),
    token: codigo.replace(/\D/g, ""),
    type: "phone_change",
  });
  if (error) throw error;
  return sincronizarVerificacion();
}

/** Copia la verificación de Auth al perfil. true si el perfil quedó con celular verificado. */
export async function sincronizarVerificacion(): Promise<boolean> {
  const { data, error } = await obtenerSupabase().rpc("sincronizar_verificacion");
  if (error) throw error;
  return data === true;
}

export interface EstadoCuenta {
  protegida: boolean;
  celularVerificado: boolean;
}

export async function leerEstadoCuenta(): Promise<EstadoCuenta> {
  const { data, error } = await obtenerSupabase().rpc("estado_cuenta");
  if (error) throw error;
  const fila = (Array.isArray(data) ? data[0] : data) as { protegida?: boolean; celular_verificado?: boolean } | null;
  return { protegida: Boolean(fila?.protegida), celularVerificado: Boolean(fila?.celular_verificado) };
}

/** «Vecinos cerca me ven si pido ayuda» → perfiles.alerta_vecinal (el perfil ya debe existir). */
export async function guardarAlertaVecinal(activar: boolean): Promise<void> {
  const { data, error: sesionError } = await obtenerSupabase().auth.getUser();
  if (sesionError) throw sesionError;
  const id = data.user?.id;
  if (!id) throw new Error("SIN_SESION");
  const { error } = await obtenerSupabase().from("perfiles").update({ alerta_vecinal: activar }).eq("id", id);
  if (error) throw error;
}
