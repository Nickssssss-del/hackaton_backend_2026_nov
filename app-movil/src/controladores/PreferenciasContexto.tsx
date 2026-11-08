/**
 * Controlador. Preferencias globales: tamaño de letra, modo oscuro, modo de uso y sonidos.
 * Se cargan antes de mostrar la primera pantalla y se guardan al cambiar (AsyncStorage).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  guardarPreferencias,
  leerPreferenciasCompletas,
  type ModoUso,
  type PreferenciasCompletas,
  type TamanoLetra,
} from "../modelos/local/preferencias";

const ORDEN_TAMANOS: TamanoLetra[] = ["normal", "grande", "enorme"];

interface PreferenciasContextoTipo extends PreferenciasCompletas {
  cargando: boolean;
  setTamano: (tamano: TamanoLetra) => void;
  /** Botón Aa: Normal → Grande → Enorme → Normal. */
  siguienteTamano: () => void;
  setOscuro: (activar: boolean) => void;
  setModo: (modo: ModoUso) => void;
  setSonidos: (activar: boolean) => void;
}

const VALORES_INICIALES: PreferenciasCompletas = {
  tamano: "normal",
  oscuro: false,
  modo: null,
  sonidos: true,
};

const PreferenciasContexto = createContext<PreferenciasContextoTipo>({
  ...VALORES_INICIALES,
  cargando: true,
  setTamano: () => undefined,
  siguienteTamano: () => undefined,
  setOscuro: () => undefined,
  setModo: () => undefined,
  setSonidos: () => undefined,
});

export function PreferenciasProveedor({ children }: { children: ReactNode }) {
  const [valores, setValores] = useState<PreferenciasCompletas>(VALORES_INICIALES);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    leerPreferenciasCompletas()
      .then((p) => {
        if (activo) setValores(p);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const actualizar = useCallback((cambios: Partial<PreferenciasCompletas>) => {
    setValores((previos) => ({ ...previos, ...cambios }));
    void guardarPreferencias({
      ...(cambios.tamano !== undefined ? { tamano: cambios.tamano } : {}),
      ...(cambios.oscuro !== undefined ? { oscuro: cambios.oscuro, tema: cambios.oscuro ? "oscuro" : "claro" } : {}),
      ...(cambios.modo ? { modo: cambios.modo } : {}),
      ...(cambios.sonidos !== undefined ? { sonidos: cambios.sonidos } : {}),
    });
  }, []);

  const valor = useMemo<PreferenciasContextoTipo>(
    () => ({
      ...valores,
      cargando,
      setTamano: (tamano) => actualizar({ tamano }),
      siguienteTamano: () => {
        const i = ORDEN_TAMANOS.indexOf(valores.tamano);
        actualizar({ tamano: ORDEN_TAMANOS[(i + 1) % ORDEN_TAMANOS.length] });
      },
      setOscuro: (oscuro) => actualizar({ oscuro }),
      setModo: (modo) => actualizar({ modo }),
      setSonidos: (sonidos) => actualizar({ sonidos }),
    }),
    [valores, cargando, actualizar],
  );

  return <PreferenciasContexto.Provider value={valor}>{children}</PreferenciasContexto.Provider>;
}

export function usePreferencias() {
  return useContext(PreferenciasContexto);
}
