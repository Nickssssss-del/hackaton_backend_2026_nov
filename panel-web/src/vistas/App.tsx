/**
 * Vista. Lista grupos públicos y recuerda que el admin usa el panel de Supabase.
 */
import { useGrupos } from "../controladores/useGrupos";
import { useSesion } from "../controladores/useSesion";
import { Acceso } from "./Acceso";

export function App() {
  const sesion = useSesion();
  const { grupos, error } = useGrupos();

  if (!sesion.activa) return <Acceso error={sesion.error} onEntrar={sesion.entrar} />;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Panel del barrio</h1>
      <button type="button" onClick={sesion.salir} className="mt-2 underline">
        Salir
      </button>
      <p className="mt-2">
        La revisión de reportes y altas de administradores se hace en el panel de Supabase. Esta página solo muestra
        los grupos de apoyo públicos.
      </p>
      {error ? <p className="mt-4">{error}</p> : null}
      <ul className="mt-6 space-y-3">
        {grupos.map((grupo) => (
          <li key={grupo.id} className="rounded-xl bg-stone-100 p-4">
            <p className="font-semibold">{grupo.nombre}</p>
            <p>{grupo.tipo}</p>
            <p>{grupo.verificada ? "Verificado por el equipo" : "Dato de la comunidad"}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
