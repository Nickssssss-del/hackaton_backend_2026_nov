/**
 * Contexto de preferencias globales (sonidos, etc.).
 * Evita pasar props por toda la app.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { leerPreferencias } from "../modelos/local/preferencias";

interface PreferenciasContextoType {
  sonidos: boolean;
  setSonidos: (activar: boolean) => void;
  cargando: boolean;
}

const PreferenciasContexto = createContext<PreferenciasContextoType>({
  sonidos: true,
  setSonidos: () => {},
  cargando: true,
});

export function PreferenciasProveedor({ children }: { children: ReactNode }) {
  const [sonidos, setSonidosState] = useState(true);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    leerPreferencias().then((p) => {
      if (activo) {
        setSonidosState(p.sonidos ?? true);
        setCargando(false);
      }
    });
    return () => { activo = false; };
  }, []);

  const setSonidos = async (activar: boolean) => {
    setSonidosState(activar);
    const { guardarPreferencias } = await import("../modelos/local/preferencias");
    await guardarPreferencias({ sonidos: activar });
  };

  return (
    <PreferenciasContexto.Provider value={{ sonidos, setSonidos, cargando }}>
      {children}
    </PreferenciasContexto.Provider>
  );
}

export function usePreferencias() {
  return useContext(PreferenciasContexto);
}