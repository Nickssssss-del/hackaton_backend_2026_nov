/**
 * Vista. Personas reportadas por decidir («Bloquear» con motivo o «Descartar»)
 * y personas bloqueadas («Desbloquear»). Un reporte a una persona no oculta nada por sí solo.
 */
import { useBloqueos } from "../controladores/useBloqueos";
import { usePanel } from "./contexto";
import { diaMes, idCorto, inicial, motivoComunidad, nombrePersona } from "./etiquetas";
import { SelectorBloqueo } from "./moderacion";
import { Aviso, Boton, Celda, Cuerpo, Encabezado, Estado, Pill, Tabla, Vacio } from "./ui";

function Persona({ nombre, id, tono }: { nombre: string; id: string; tono: "azul" | "rojo" }) {
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-titulo font-bold ${
          tono === "azul" ? "bg-marca-suave text-marca" : "bg-rojo-suave text-rojo"
        }`}
      >
        {inicial(nombre)}
      </span>
      <span>
        <span className="block font-titulo font-semibold">{nombre}</span>
        <span className="block font-mono text-xs text-tinta-2">{idCorto(id)}</span>
      </span>
    </span>
  );
}

export function Bloqueos() {
  const { correo } = usePanel();
  const b = useBloqueos();
  const ocupado = b.enCurso !== null;

  return (
    <>
      <Encabezado titulo="Bloqueos" subtitulo="Reportes a personas · estos reportes no ocultan nada por sí solos" />
      <Cuerpo>
        <Estado cargando={b.cargando} error={b.error} aviso={b.aviso} onRecargar={() => void b.recargar()} />

        <section aria-labelledby="por-decidir" className="space-y-3">
          <h2 id="por-decidir" className="text-xl font-semibold">
            Por decidir · {b.porDecidir.length}
          </h2>
          {!b.cargando && b.porDecidir.length === 0 ? (
            <Vacio>Nadie espera una decisión.</Vacio>
          ) : b.porDecidir.length > 0 ? (
            <Tabla etiqueta="Personas reportadas por decidir" columnas={["Persona", "Por qué la reportaron", "Motivo", "Acción"]}>
              {b.porDecidir.map((p) => {
                const nombre = nombrePersona(p.nombre, p.usuario_id);
                return (
                  <tr key={p.usuario_id}>
                    <Celda className="align-middle">
                      <Persona nombre={nombre} id={p.usuario_id} tono="azul" />
                    </Celda>
                    <Celda className="align-middle">
                      <span className="flex flex-wrap gap-1.5">
                        {p.motivos.map((m) => (
                          <Pill key={m.motivo} tono="rojo">
                            {motivoComunidad(m.motivo)} · {m.cantidad}
                          </Pill>
                        ))}
                      </span>
                      <span className="mt-1.5 block text-[15px] text-tinta-2">
                        {p.contexto ?? `${p.ids.length === 1 ? "1 reporte" : `${p.ids.length} reportes`} · último ${diaMes(p.ultimo)}`}
                      </span>
                    </Celda>
                    <Celda colSpan={2}>
                      <div className="flex flex-wrap items-end gap-3">
                        <SelectorBloqueo
                          persona={nombre}
                          ocupado={ocupado}
                          guardando={b.enCurso === p.usuario_id}
                          onBloquear={(motivo) => void b.bloquearPersona(p.usuario_id, motivo)}
                        />
                        <Boton
                          variante="secundario"
                          disabled={ocupado}
                          className="h-11"
                          onClick={() => {
                            if (window.confirm(`¿Descartar los reportes a ${nombre}? No se puede deshacer.`)) void b.descartar(p);
                          }}
                          aria-label={`Descartar los reportes a ${nombre}`}
                        >
                          Descartar
                        </Boton>
                      </div>
                    </Celda>
                  </tr>
                );
              })}
            </Tabla>
          ) : null}
        </section>

        <section aria-labelledby="bloqueados" className="space-y-3">
          <h2 id="bloqueados" className="text-xl font-semibold">
            Bloqueados · {b.bloqueos.length}
          </h2>
          {!b.cargando && b.bloqueos.length === 0 ? (
            <Vacio>No hay personas bloqueadas.</Vacio>
          ) : b.bloqueos.length > 0 ? (
            <Tabla etiqueta="Personas bloqueadas" columnas={["Persona", "Motivo", "Desde", "Acción"]}>
              {b.bloqueos.map((bl) => {
                const nombre = nombrePersona(bl.nombre, bl.user_id);
                const quien = bl.creado_por
                  ? bl.creado_por === b.miId
                    ? correo ?? "ti"
                    : idCorto(bl.creado_por)
                  : null;
                return (
                  <tr key={bl.user_id}>
                    <Celda className="align-middle">
                      <Persona nombre={nombre} id={bl.user_id} tono="rojo" />
                    </Celda>
                    <Celda className="align-middle">{bl.motivo ?? "Sin motivo"}</Celda>
                    <Celda className="align-middle">
                      {diaMes(bl.creado_en)}
                      {quien ? ` · ${quien}` : ""}
                    </Celda>
                    <Celda className="align-middle">
                      <Boton
                        variante="desbloquear"
                        disabled={ocupado}
                        onClick={() => {
                          if (window.confirm(`¿Desbloquear a ${nombre}? Podrá volver a usar la app.`)) void b.quitarBloqueo(bl.user_id);
                        }}
                        aria-label={`Desbloquear a ${nombre}`}
                      >
                        {b.enCurso === bl.user_id ? "Guardando…" : "Desbloquear"}
                      </Boton>
                    </Celda>
                  </tr>
                );
              })}
            </Tabla>
          ) : null}
        </section>

        <Aviso>Una persona bloqueada no puede publicar, comentar ni reportar. En su app ve: «Por ahora no puedes hacer esto».</Aviso>
      </Cuerpo>
    </>
  );
}
