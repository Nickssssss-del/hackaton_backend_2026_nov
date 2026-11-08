/**
 * Controlador. URL temporal de una foto del bucket privado `fotos` (negocios y publicaciones).
 * Sin internet o sin permiso devuelve null y la vista muestra el ícono de siempre.
 */
import { useQuery } from "@tanstack/react-query";
import { urlDeFoto } from "../modelos/fotosRepositorio";
import { sinBase } from "./useAyudaVecinos";

export function useUrlFoto(ruta: string | undefined): string | null {
  const consulta = useQuery({
    queryKey: ["foto", ruta],
    queryFn: () => (ruta ? urlDeFoto(ruta) : Promise.resolve(null)),
    enabled: !!ruta && !sinBase(),
    staleTime: 1000 * 60 * 50,
    retry: 0,
  });
  return consulta.data ?? null;
}
