/**
 * Vista. Pide sesión de admin y muestra las pantallas del panel.
 */
import { useState, type ReactNode } from "react";
import { useSesion } from "../controladores/useSesion";
import { Acceso } from "./Acceso";
import { Bloqueos } from "./Bloqueos";
import { ComunidadOculta } from "./ComunidadOculta";
import { EmergenciasActivas } from "./EmergenciasActivas";
import { EmergenciasCerradas } from "./EmergenciasCerradas";
import { GruposApoyo } from "./GruposApoyo";
import { Resumen } from "./Resumen";
import { ServiciosOcultos } from "./ServiciosOcultos";

const PANTALLAS = [
  { id: "resumen", titulo: "Resumen del día", Vista: Resumen },
  { id: "ocultos", titulo: "Servicios ocultos", Vista: ServiciosOcultos },
  { id: "grupos", titulo: "Grupos de apoyo", Vista: GruposApoyo },
  { id: "emergencias", titulo: "Emergencias activas", Vista: EmergenciasActivas },
  { id: "cerradas", titulo: "Emergencias cerradas", Vista: EmergenciasCerradas },
  { id: "comunidad", titulo: "Comunidad oculta", Vista: ComunidadOculta },
  { id: "bloqueos", titulo: "Bloqueos", Vista: Bloqueos },
] as const;

type Pantalla = (typeof PANTALLAS)[number]["id"];

function Icono({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const ICONOS: Record<Pantalla, ReactNode> = {
  resumen: (
    <Icono>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </Icono>
  ),
  emergencias: (
    <Icono>
      <path d="M12 4v8" />
      <path d="M12 16h.01" />
      <circle cx="12" cy="12" r="8" />
    </Icono>
  ),
  cerradas: (
    <Icono>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </Icono>
  ),
  ocultos: (
    <Icono>
      <path d="M4 9h16v10H4z" />
      <path d="M8 9V7a4 4 0 0 1 8 0v2" />
    </Icono>
  ),
  comunidad: (
    <Icono>
      <circle cx="9" cy="9" r="2.5" />
      <circle cx="16" cy="10" r="2" />
      <path d="M4.5 18c.6-2.2 2.4-3.5 4.5-3.5s3.9 1.3 4.5 3.5" />
      <path d="M14 14.6c1.2-.4 2.4-.1 3.3.8.7.8 1 1.7 1.2 2.6" />
    </Icono>
  ),
  grupos: (
    <Icono>
      <circle cx="8" cy="9" r="2" />
      <circle cx="16" cy="9" r="2" />
      <path d="M4.5 17c.5-2 2-3.2 3.5-3.2S11 15 11.5 17" />
      <path d="M12.5 17c.5-2 2-3.2 3.5-3.2s3 1.2 3.5 3.2" />
    </Icono>
  ),
  bloqueos: (
    <Icono>
      <rect x="6" y="11" width="12" height="8" rx="1.5" />
      <path d="M9 11V8a3 3 0 0 1 6 0v3" />
    </Icono>
  ),
};

const SECCIONES: { titulo: string; ids: Pantalla[] }[] = [
  { titulo: "Monitoreo", ids: ["resumen", "emergencias", "cerradas"] },
  { titulo: "Moderación", ids: ["ocultos", "comunidad", "grupos", "bloqueos"] },
];

export function App() {
  const sesion = useSesion();
  const [pantalla, setPantalla] = useState<Pantalla>("resumen");
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (sesion.estado === "cargando") {
    return <p className="bg-[#F5F3EE] p-6 text-base text-stone-800">Cargando…</p>;
  }

  if (sesion.estado === "fuera") {
    return <Acceso error={sesion.error} enviando={sesion.enviando} onEntrar={(c, k) => void sesion.entrar(c, k)} />;
  }

  const Vista = PANTALLAS.find((p) => p.id === pantalla)!.Vista;
  const elegir = (id: Pantalla) => {
    setPantalla(id);
    setMenuAbierto(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-stone-900">
      {menuAbierto ? (
        <button
          type="button"
          className="fixed inset-0 z-10 bg-stone-900/40 min-[800px]:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
        />
      ) : null}

      <aside
        id="menu-panel"
        className={`${menuAbierto ? "flex" : "hidden"} fixed inset-y-0 left-0 z-20 w-[260px] flex-col border-r border-stone-200 bg-white min-[800px]:flex`}
      >
        <div className="px-5 pt-6 pb-4">
          <p className="text-2xl font-bold">Kuna</p>
          <p className="text-base text-stone-600">Panel administrativo</p>
        </div>
        <nav aria-label="Pantallas del panel" className="flex-1 space-y-6 overflow-y-auto px-3">
          {SECCIONES.map((seccion) => (
            <div key={seccion.titulo}>
              <p className="px-3 pb-2 text-base font-semibold tracking-wide text-stone-600 uppercase">{seccion.titulo}</p>
              <ul className="space-y-1">
                {seccion.ids.map((id) => {
                  const item = PANTALLAS.find((p) => p.id === id)!;
                  const activo = pantalla === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => elegir(id)}
                        aria-current={activo ? "page" : undefined}
                        className={`flex w-full items-center gap-3 rounded-full px-3 py-2 text-left text-base font-medium ${
                          activo ? "bg-[#1F4E9C] text-white" : "text-stone-900 hover:bg-stone-100"
                        }`}
                      >
                        {ICONOS[id]}
                        {item.titulo}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-stone-200 p-4">
          {sesion.correo ? <p className="mb-3 text-base break-all text-stone-700">{sesion.correo}</p> : null}
          <button
            type="button"
            onClick={() => void sesion.salir()}
            className="w-full rounded-full border border-stone-300 px-4 py-2 text-base font-medium hover:bg-stone-100"
          >
            Salir
          </button>
        </div>
      </aside>

      <div className="min-[800px]:pl-[260px]">
        <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 min-[800px]:hidden">
          <button
            type="button"
            aria-expanded={menuAbierto}
            aria-controls="menu-panel"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            className="rounded-full border border-stone-300 px-4 py-2 text-base font-medium hover:bg-stone-100"
          >
            Menú
          </button>
          <p className="text-base font-semibold">Kuna</p>
        </div>
        <main className="p-4 sm:p-8">
          <Vista />
        </main>
      </div>
    </div>
  );
}
