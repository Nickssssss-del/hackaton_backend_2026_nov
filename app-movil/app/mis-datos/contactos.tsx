/**
 * Vista. Editar contactos de emergencia (máx. 2).
 * Reutiliza la lógica del registro: agenda o escribir.
 * Guarda en local/contactos (nunca en Supabase).
 */
import { Redirect } from "expo-router";

/** Compatibilidad con enlaces antiguos: la pantalla activa es la del flujo A5. */
export default function ContactosAntiguos() {
  return <Redirect href={{ pathname: "/alta/contactos", params: { editar: "1" } }} />;
}