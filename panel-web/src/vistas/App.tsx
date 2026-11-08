/**
 * Vista. Pide sesión de admin y muestra el panel: barra lateral con
 * «Monitoreo» y «Moderación», filtro de zona y la pantalla elegida.
 */
import { useMemo, useState, type ComponentType } from "react";
import { usePendientes } from "../controladores/usePendientes";
import { useSesion } from "../controladores/useSesion";
import { useZonas } from "../controladores/useZonas";
import { Acceso } from "./Acceso";
import { Bloqueos } from "./Bloqueos";
import { ComunidadOculta } from "./ComunidadOculta";
import { Panel, type ContextoPanel, type IdPantalla } from "./contexto";
import { EmergenciasActivas } from "./EmergenciasActivas";
import { EmergenciasCerradas } from "./EmergenciasCerradas";
import { GruposApoyo } from "./GruposApoyo";
import { Resumen } from "./Resumen";
import { ServiciosOcultos } from "./ServiciosOcultos";
import { Icono, Logo, type NombreIcono } from "./ui";

type Entrada = { id: IdPantalla; titulo: string; icono: NombreIcono; Vista: ComponentType };

const SECCIONES: { titulo: string; entradas: Entrada[] }[] = [
  {
    titulo: "Monitoreo",
    entradas: [
      { id: "resumen", titulo: "Resumen del día", icono: "casa", Vista: Resumen },
      { id: "activas", titulo: "Emergencias activas", icono: "alerta", Vista: EmergenciasActivas },
      { id: "cerradas", titulo: "Emergencias cerradas", icono: "reloj", Vista: EmergenciasCerradas },
    ],
  },
  {
    titulo: "Moderación",
    entradas: [
      { id: "servicios", titulo: "Servicios ocultos", icono: "tienda", Vista: ServiciosOcultos },
      { id: "comunidad", titulo: "Comunidad oculta", icono: "mensaje", Vista: ComunidadOculta },
      { id: "bloqueos", titulo: "Bloqueos", icono: "prohibido", Vista: Bloqueos },
      { id: "grupos", titulo: "Grupos de apoyo", icono: "corazon", Vista: GruposApoyo },
    ],
  },
];

const ENTRADAS = SECCIONES.flatMap((s) => s.entradas);

export function App() {
  const sesion = useSesion();

  if (sesion.estado === "cargando") {
    return (
      <div className="flex min-h-screen items-center justify-center text-marca">
        <Logo className="latido h-16 w-16" />
        <span className="sr-only">Cargando…</span>
      </div>
    );
  }

  if (sesion.estado === "fuera") {
    return (
      <Acceso
        error={sesion.error}
        enviando={sesion.enviando}
        configurado={sesion.configurado}
        onEntrar={(c, k) => void sesion.entrar(c, k)}
        onDemo={sesion.entrarDemo}
      />
    );
  }

  return <PanelAdmin correo={sesion.correo} demo={sesion.demo} onSalir={() => void sesion.salir()} />;
}

function PanelAdmin({ correo, demo, onSalir }: { correo: string | null; demo: boolean; onSalir: () => void }) {
  const [pantalla, setPantalla] = useState<IdPantalla>("resumen");
  const [zona, setZona] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const zonas = useZonas();
  const pendientes = usePendientes(zona, pantalla);

  const contexto = useMemo<ContextoPanel>(
    () => ({ zona, zonas, fijarZona: setZona, pendientes, irA: setPantalla, correo }),
    [zona, zonas, pendientes, correo],
  );

  const contadores: Partial<Record<IdPantalla, number>> = {
    servicios: pendientes.servicios,
    comunidad: pendientes.publicaciones + pendientes.comentarios,
    bloqueos: pendientes.personas,
  };
  const hayEmergencias = pendientes.emergencias.length > 0;

  const actual = ENTRADAS.find((e) => e.id === pantalla)!;
  const Vista = actual.Vista;

  const ir = (id: IdPantalla) => {
    setPantalla(id);
    setMenuAbierto(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <Panel.Provider value={contexto}>
      <div className="min-h-screen lg:grid lg:grid-cols-[18rem_1fr]">
        {/* Barra superior en pantallas chicas */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-borde bg-superficie px-4 py-3 lg:hidden">
          <Marca />
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-expanded={menuAbierto}
            aria-controls="menu-panel"
            className="rounded-lg border border-borde-fuerte p-2"
          >
            <Icono nombre="menu" />
            <span className="sr-only">Menú</span>
          </button>
        </div>

        <aside
          id="menu-panel"
          className={`${menuAbierto ? "flex" : "hidden"} flex-col border-r border-borde bg-superficie lg:sticky lg:top-0 lg:flex lg:h-screen`}
        >
          <div className="hidden px-6 pb-2 pt-6 lg:block">
            <Marca />
          </div>
          <nav aria-label="Pantallas del panel" className="flex-1 overflow-y-auto px-3 pb-4">
            {SECCIONES.map((seccion) => (
              <div key={seccion.titulo} className="mt-5">
                <p className="px-3 pb-2 font-titulo text-[13px] font-semibold uppercase tracking-wider text-tinta-2">
                  {seccion.titulo}
                </p>
                <ul className="space-y-1">
                  {seccion.entradas.map((e) => {
                    const activa = e.id === pantalla;
                    const n = contadores[e.id] ?? 0;
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => ir(e.id)}
                          aria-current={activa ? "page" : undefined}
                          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-titulo text-[15px] font-semibold transition-colors ${
                            activa ? "bg-marca text-white" : "text-tinta hover:bg-fondo"
                          }`}
                        >
                          <Icono nombre={e.icono} className="h-5 w-5 shrink-0" />
                          <span className="flex-1">{e.titulo}</span>
                          {e.id === "activas" && hayEmergencias ? (
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full ${activa ? "" : "bg-rojo-suave"}`}
                              title={`${pendientes.emergencias.length} activas`}
                            >
                              <span className="latido h-2.5 w-2.5 rounded-full bg-rojo" />
                              <span className="sr-only">{pendientes.emergencias.length} emergencias activas</span>
                            </span>
                          ) : null}
                          {n > 0 ? (
                            <span
                              className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[13px] font-bold ${
                                activa ? "bg-white text-rojo" : "bg-rojo-suave text-rojo"
                              }`}
                            >
                              {n}
                              <span className="sr-only"> por revisar</span>
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mx-3 flex items-center gap-3 border-t border-borde px-2 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca-suave text-marca">
              <Icono nombre="usuario" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-titulo text-[15px] font-semibold">Administrador</p>
              <p className="truncate text-sm text-tinta-2">{correo ?? "Sin correo"}</p>
            </div>
            <button
              type="button"
              onClick={onSalir}
              title="Salir"
              className="rounded-lg border border-borde-fuerte p-2 text-tinta-2 hover:bg-fondo"
            >
              <Icono nombre="salir" className="h-5 w-5" />
              <span className="sr-only">Salir</span>
            </button>
          </div>
        </aside>

        <main className="min-w-0">
          {demo ? (
            <p className="bg-ambar-suave px-4 py-2 text-center text-sm font-medium text-ambar sm:px-10">
              Modo demo: datos de ejemplo. Los cambios no se guardan en la base.
            </p>
          ) : null}
          <Vista key={pantalla} />
        </main>
      </div>
    </Panel.Provider>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-3 text-marca">
      <Logo className="h-11 w-11" />
      <div>
        <p className="font-titulo text-lg font-bold leading-tight text-tinta">Vecinos</p>
        <p className="text-sm text-tinta-2">Panel administrativo</p>
      </div>
    </div>
  );
}
