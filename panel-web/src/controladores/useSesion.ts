/**
 * Controlador. Recuerda el acceso de prueba en esta pestaña.
 */
import { useState } from "react";
import { credencialesValidas } from "../modelos/sesion";

const CLAVE = "panel.sesion";

export function useSesion() {
  const [activa, setActiva] = useState(() => sessionStorage.getItem(CLAVE) === "1");
  const [error, setError] = useState<string | null>(null);

  const entrar = (usuario: string, clave: string) => {
    if (!credencialesValidas(usuario, clave)) {
      setError("Usuario o contraseña de prueba incorrectos.");
      return;
    }
    sessionStorage.setItem(CLAVE, "1");
    setError(null);
    setActiva(true);
  };

  const salir = () => {
    sessionStorage.removeItem(CLAVE);
    setActiva(false);
  };

  return { activa, error, entrar, salir };
}
