import { useEffect, useState } from "react";
import { asegurarSesionAnonima } from "../modelos/supabase";

export function useSesion() {
  const [lista, setLista] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let activo = true;
    void asegurarSesionAnonima()
      .then(() => {
        if (activo) setLista(true);
      })
      .catch((causa: unknown) => {
        if (activo) {
          setError(causa);
          setLista(true);
        }
      });
    return () => {
      activo = false;
    };
  }, []);

  return { lista, error };
}
