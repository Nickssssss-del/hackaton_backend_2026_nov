import { createContext, useMemo, useState, type ReactNode } from "react";
import { temas, type TemaNombre, type TokensTema } from "./tokens";

export const TemaContext = createContext<{
  tema: TokensTema;
  cambiarTema: (nombre: TemaNombre) => void;
}>({ tema: temas.claro, cambiarTema: () => undefined });

export function TemaProveedor({ children }: { children: ReactNode }) {
  const [nombre, setNombre] = useState<TemaNombre>("claro");
  const valor = useMemo(
    () => ({ tema: temas[nombre], cambiarTema: setNombre }),
    [nombre],
  );
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}
