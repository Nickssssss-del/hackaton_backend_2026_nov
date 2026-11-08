/**
 * Vista. Tema derivado de las preferencias (oscuro y tamaño de letra).
 * La emergencia fuerza su propio tema y al salir vuelve a las preferencias.
 */
import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { usePreferencias } from "../../controladores/PreferenciasContexto";
import { crearTema, type TemaNombre, type TokensTema } from "./tokens";

export const TemaContext = createContext<{
  tema: TokensTema;
  /** Compatibilidad con pantallas anteriores: "oscuro" o "claro" cambia la preferencia guardada. */
  cambiarTema: (nombre: TemaNombre) => void;
  activarEmergencia: () => void;
  salirEmergencia: () => void;
}>({
  tema: crearTema("claro", false, "normal"),
  cambiarTema: () => undefined,
  activarEmergencia: () => undefined,
  salirEmergencia: () => undefined,
});

export function TemaProveedor({ children }: { children: ReactNode }) {
  const { oscuro, tamano, setOscuro } = usePreferencias();
  const [enEmergencia, setEnEmergencia] = useState(false);

  const cambiarTema = useCallback(
    (nombre: TemaNombre) => {
      if (nombre === "emergencia") setEnEmergencia(true);
      else setOscuro(nombre === "oscuro");
    },
    [setOscuro],
  );

  const valor = useMemo(
    () => ({
      tema: crearTema(enEmergencia ? "emergencia" : oscuro ? "oscuro" : "claro", oscuro, tamano),
      cambiarTema,
      activarEmergencia: () => setEnEmergencia(true),
      salirEmergencia: () => setEnEmergencia(false),
    }),
    [enEmergencia, oscuro, tamano, cambiarTema],
  );
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}
