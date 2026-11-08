/**
 * Vista. Emergencias activas con su cadena de llamadas y los vecinos que van.
 * Solo lectura, en tiempo real. No muestra nombre, dirección ni ubicación de la persona.
 */
import { useEmergenciasActivas } from "../controladores/useEmergenciasActivas";
import { enZona } from "../controladores/usePendientes";
import type { EmergenciaActiva } from "../modelos/emergencias";
import { usePanel } from "./contexto";
import { estadoEslabon, haceTiempo, tipoEslabon, venceEn } from "./etiquetas";
import { Aviso, Cuerpo, Encabezado, Estado, Icono, Pill, Vacio } from "./ui";

function EnVivo({ enVivo }: { enVivo: boolean | null }) {
  if (enVivo === null) {
    return <span className="rounded-full bg-gris-suave px-4 py-2 font-titulo text-sm font-semibold text-tinta-2">Conectando…</span>;
  }
  if (!enVivo) {
    return (
      <span role="status" className="rounded-full bg-ambar-suave px-4 py-2 font-titulo text-sm font-semibold text-ambar">
        Sin conexión en vivo · se recarga cada 15 s
      </span>
    );
  }
  return (
    <span role="status" className="inline-flex items-center gap-2 rounded-full bg-rojo-suave px-4 py-2 font-titulo text-[15px] font-semibold text-rojo">
      <span className="latido h-2.5 w-2.5 rounded-full bg-rojo" aria-hidden="true" />
      En vivo
    </span>
  );
}

export function EmergenciasActivas() {
  const { zona } = usePanel();
  const { emergencias, cargando, error, enVivo, ahora, recargar } = useEmergenciasActivas();
  const visibles = emergencias.filter(enZona(zona));

  return (
    <>
      <Encabezado
        titulo="Emergencias activas"
        subtitulo="Solo lectura · se actualiza solo · sin nombre, dirección ni ubicación de la persona"
        extra={<EnVivo enVivo={enVivo} />}
      />
      <Cuerpo>
        <Aviso>
          El panel solo mira. Las emergencias las abre y cierra el celular de la vecina («Estoy bien») o vencen solas.
        </Aviso>
        <Estado cargando={cargando} error={error} onRecargar={recargar} />
        {!cargando && !error && visibles.length === 0 ? (
          <Vacio>No hay emergencias activas{zona ? ` en ${zona}` : ""}.</Vacio>
        ) : null}
        <ul className="space-y-6">
          {visibles.map((e) => (
            <Emergencia key={e.id} e={e} ahora={ahora} />
          ))}
        </ul>
      </Cuerpo>
    </>
  );
}

function Emergencia({ e, ahora }: { e: EmergenciaActiva; ahora: number }) {
  const real = !e.practica;
  let resuelto = false;

  return (
    <li
      className={`rounded-2xl border bg-superficie p-6 ${real ? "border-rojo ring-1 ring-rojo" : "border-borde"}`}
      aria-label={`Emergencia ${e.codigo}${real ? ", real" : ", de práctica"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{e.codigo}</h2>
          {real ? <Pill tono="rojo">Real</Pill> : <Pill tono="ambar">Práctica</Pill>}
          {e.avisar_vecinos ? <Pill tono="verde">Avisa a vecinos</Pill> : <Pill tono="gris">Sin aviso a vecinos</Pill>}
        </div>
        <p className="text-[15px] text-tinta-2">
          {e.zona ?? "Zona sin identificar"} · empezó {haceTiempo(e.creado_en, ahora)}
          <span className="text-tinta-3"> · {venceEn(e.expira_en, ahora)}</span>
        </p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <h3 className="font-titulo text-[13px] font-semibold uppercase tracking-wider text-tinta-2">Cadena de llamadas</h3>
          {e.eslabones.length === 0 ? (
            <p className="mt-2 text-tinta-2">Todavía no hay llamadas.</p>
          ) : (
            <ol className="mt-2 space-y-2.5">
              {e.eslabones.map((s) => {
                const estado = estadoEslabon(s.estado, resuelto);
                if (s.estado === "hablamos" || s.estado === "va_en_camino") resuelto = true;
                const circulo =
                  estado.tono === "rojo" ? "bg-rojo" : estado.tono === "verde" ? "bg-verde" : "bg-[#8d867a]";
                const texto =
                  estado.tono === "rojo" ? "text-rojo/80" : estado.tono === "verde" ? "text-verde" : "text-tinta-2";
                return (
                  <li key={s.orden} className="flex items-center gap-3 rounded-xl border border-borde px-3.5 py-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-titulo text-sm font-bold text-white ${circulo}`}>
                      {s.orden}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-titulo font-semibold">{s.contacto ?? "Sin nombre"}</span>
                      <span className="block text-sm text-tinta-2">{tipoEslabon(s.contacto)}</span>
                    </span>
                    <span className={`font-titulo text-sm font-semibold ${texto}`}>{estado.texto}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div>
          <h3 className="font-titulo text-[13px] font-semibold uppercase tracking-wider text-tinta-2">Vecinos que van</h3>
          <div className="mt-2 flex items-center gap-4 rounded-xl bg-verde-suave px-5 py-5 text-verde">
            <Icono nombre="caminante" className="h-7 w-7" />
            <p>
              <span className="block font-titulo text-3xl font-bold leading-none">{e.vecinos_van}</span>
              <span className="mt-1 block font-titulo font-semibold">en camino</span>
            </p>
          </div>
          {e.vecinos_retirados > 0 ? (
            <p className="mt-3 text-[15px] text-tinta-2">
              {e.vecinos_retirados === 1 ? "1 vecino se retiró" : `${e.vecinos_retirados} vecinos se retiraron`} («Ya no
              puedo ir»)
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
