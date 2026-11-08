/**
 * Vista. Pide sesión de admin y muestra las pantallas del panel.
 */
import { useState } from "react";
import { useSesion } from "../controladores/useSesion";
import { Acceso } from "./Acceso";
import { Bloqueos } from "./Bloqueos";
import { ComunidadOculta } from "./ComunidadOculta";
import { EmergenciasActivas } from "./EmergenciasActivas";
import { GruposApoyo } from "./GruposApoyo";
import { ServiciosOcultos } from "./ServiciosOcultos";

const PANTALLAS = [
  { id: "ocultos", titulo: "Servicios ocultos", Vista: ServiciosOcultos },
  { id: "grupos", titulo: "Grupos de apoyo", Vista: GruposApoyo },
  { id: "emergencias", titulo: "Emergencias activas", Vista: EmergenciasActivas },
  { id: "comunidad", titulo: "Comunidad oculta", Vista: ComunidadOculta },
  { id: "bloqueos", titulo: "Bloqueos", Vista: Bloqueos },
] as const;

type Pantalla = (typeof PANTALLAS)[number]["id"];

export function App() {
  const sesion = useSesion();
  const [pantalla, setPantalla] = useState<Pantalla>("ocultos");

  if (sesion.estado === "cargando") {
    return <p className="p-6 text-stone-600">Cargando…</p>;
  }

  if (sesion.estado === "fuera") {
    return <Acceso error={sesion.error} enviando={sesion.enviando} onEntrar={(c, k) => void sesion.entrar(c, k)} />;
  }

  const Vista = PANTALLAS.find((p) => p.id === pantalla)!.Vista;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <h1 className="text-2xl font-bold">Panel del barrio</h1>
          <div className="flex items-center gap-3 text-sm">
            {sesion.correo ? <span className="text-stone-600">{sesion.correo}</span> : null}
            <button type="button" onClick={() => void sesion.salir()} className="font-medium underline">
              Salir
            </button>
          </div>
        </div>
        <nav aria-label="Pantallas del panel" className="mx-auto flex max-w-3xl flex-wrap gap-1 px-6">
          {PANTALLAS.map(({ id, titulo }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPantalla(id)}
              aria-current={pantalla === id ? "page" : undefined}
              className={`border-b-2 px-3 py-2 font-medium ${
                pantalla === id ? "border-stone-900 text-stone-900" : "border-transparent text-stone-600"
              }`}
            >
              {titulo}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl p-6">
        <Vista />
      </main>
    </div>
  );
}
