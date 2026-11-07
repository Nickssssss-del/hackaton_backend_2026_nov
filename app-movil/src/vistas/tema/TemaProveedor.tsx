import { createContext, useMemo, useRef, useState, type ReactNode } from "react";
import { temas, type TemaNombre, type TokensTema } from "./tokens";

export const TemaContext = createContext<{
  tema: TokensTema;
  cambiarTema: (nombre: TemaNombre) => void;
  activarEmergencia: () => void;
  salirEmergencia: () => void;
}>({
  tema: temas.claro,
  cambiarTema: () => undefined,
  activarEmergencia: () => undefined,
  salirEmergencia: () => undefined,
});

export function TemaProveedor({ children }: { children: ReactNode }) {
  const [nombre, setNombre] = useState<TemaNombre>("claro");
  const anterior = useRef<TemaNombre>("claro");
  const activarEmergencia = () => {
    anterior.current = nombre === "emergencia" ? anterior.current : nombre;
    setNombre("emergencia");
  };
  const salirEmergencia = () => {
    setNombre(anterior.current === "emergencia" ? "claro" : anterior.current);
  };
  const valor = useMemo(
    () => ({ tema: temas[nombre], cambiarTema: setNombre, activarEmergencia, salirEmergencia }),
    [nombre],
  );
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}
