/**
 * Vista. Publicaciones y comentarios ocultos con sus reportes:
 * «Volver a mostrar», «Borrar» y «Bloquear al autor».
 */
import { useState, type ReactNode } from "react";
import { useComunidadOculta } from "../controladores/useComunidadOculta";
import type { ReporteComunidad, TablaComunidad } from "../modelos/comunidadOculta";
import { categoriaPublicacion, fecha, idCorto, motivoComunidad } from "./etiquetas";
import { FormularioBloqueo } from "./FormularioBloqueo";
import { Mensajes } from "./Mensajes";

function Reportes({ reportes, revisadoEn }: { reportes: ReporteComunidad[]; revisadoEn: string | null }) {
  return (
    <>
      <h4 className="mt-3 text-sm font-semibold">Reportes</h4>
      {reportes.length === 0 ? (
        <p className="text-sm text-stone-600">Sin reportes: lo ocultó un admin.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {reportes.map((reporte) => {
            const previo = revisadoEn !== null && Date.parse(reporte.creado_en) <= Date.parse(revisadoEn);
            return (
              <li key={reporte.id} className="flex justify-between gap-3">
                <span>
                  {motivoComunidad(reporte.motivo)}
                  {previo ? <span className="text-stone-500"> (antes de la última revisión)</span> : null}
                </span>
                <span className="text-stone-600">{fecha(reporte.creado_en)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

type TarjetaProps = {
  tabla: TablaComunidad;
  id: string;
  titulo: string;
  meta: string;
  autor: string;
  reportes: ReporteComunidad[];
  revisadoEn: string | null;
  enCurso: string | null;
  autorBloqueado: boolean;
  formularioAbierto: boolean;
  onMostrar: () => void;
  onBorrar: () => void;
  onAbrirBloqueo: () => void;
  onCerrarBloqueo: () => void;
  onBloquear: (motivo: string) => Promise<boolean>;
  children: ReactNode;
};

function Tarjeta(p: TarjetaProps) {
  const nombre = p.tabla === "publicaciones" ? "esta publicación" : "este comentario";
  const ocupado = p.enCurso !== null;
  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold">{p.titulo}</h4>
          <p className="text-sm text-stone-600">{p.meta}</p>
        </div>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-800">
          {p.reportes.length} {p.reportes.length === 1 ? "reporte" : "reportes"}
        </span>
      </div>
      {p.children}
      <Reportes reportes={p.reportes} revisadoEn={p.revisadoEn} />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={p.onMostrar}
          aria-label={`Volver a mostrar ${nombre}`}
          className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {p.enCurso === p.id ? "Guardando…" : "Volver a mostrar"}
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={p.onBorrar}
          aria-label={`Borrar ${nombre}`}
          className="rounded-lg border border-red-700 px-4 py-2 font-medium text-red-800 disabled:opacity-60"
        >
          Borrar
        </button>
        {p.autorBloqueado ? (
          <span className="self-center rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-800">
            Autor bloqueado
          </span>
        ) : (
          <button
            type="button"
            disabled={ocupado}
            onClick={p.onAbrirBloqueo}
            aria-expanded={p.formularioAbierto}
            aria-label={`Bloquear al autor de ${nombre}`}
            className="rounded-lg border border-stone-400 px-4 py-2 font-medium disabled:opacity-60"
          >
            Bloquear al autor
          </button>
        )}
      </div>
      {p.formularioAbierto && !p.autorBloqueado ? (
        <FormularioBloqueo
          persona={idCorto(p.autor)}
          enviando={p.enCurso === p.autor}
          onBloquear={p.onBloquear}
          onCancelar={p.onCerrarBloqueo}
        />
      ) : null}
    </li>
  );
}

export function ComunidadOculta() {
  const c = useComunidadOculta();
  const [bloqueando, setBloqueando] = useState<string | null>(null);
  const vacio = !c.cargando && !c.error && c.publicaciones.length === 0 && c.comentarios.length === 0;

  const propsComunes = (tabla: TablaComunidad, id: string, autor: string) => {
    const clave = `${tabla}:${id}`;
    const nombre = tabla === "publicaciones" ? "esta publicación" : "este comentario";
    return {
      tabla,
      id,
      autor,
      enCurso: c.enCurso,
      autorBloqueado: c.bloqueados.has(autor),
      formularioAbierto: bloqueando === clave,
      onMostrar: () => void c.mostrar(tabla, id),
      onBorrar: () => {
        if (window.confirm(`¿Borrar ${nombre}? También se borran sus reportes. No se puede deshacer.`)) {
          void c.borrar(tabla, id);
        }
      },
      onAbrirBloqueo: () => setBloqueando(clave),
      onCerrarBloqueo: () => setBloqueando(null),
      onBloquear: (motivo: string) => c.bloquearAutor(autor, motivo),
    };
  };

  return (
    <section aria-labelledby="titulo-comunidad">
      <h2 id="titulo-comunidad" className="text-xl font-bold">
        Comunidad oculta
      </h2>
      <p className="mt-1 text-stone-700">
        Publicaciones y comentarios que se ocultaron con 3 reportes o por un admin. Al volver a mostrarlos, el conteo
        empieza de cero.
      </p>

      <Mensajes cargando={c.cargando} error={c.error} aviso={c.aviso} onRecargar={() => void c.recargar()} />

      {vacio ? <p className="mt-6 rounded-xl bg-stone-100 p-4">No hay contenido oculto.</p> : null}

      {c.publicaciones.length > 0 ? (
        <>
          <h3 className="mt-6 text-lg font-semibold">Publicaciones</h3>
          <ul className="mt-3 space-y-4">
            {c.publicaciones.map((p) => (
              <Tarjeta
                key={p.id}
                {...propsComunes("publicaciones", p.id, p.autor)}
                titulo={categoriaPublicacion(p.categoria)}
                meta={`${idCorto(p.autor)}${p.zona ? ` · ${p.zona}` : ""} · ${fecha(p.creado_en)}`}
                reportes={p.reportes}
                revisadoEn={p.revisado_en}
              >
                {p.mensaje ? <p className="mt-2">{p.mensaje}</p> : null}
                {p.lugar ? <p className="mt-1 text-sm text-stone-700">Lugar: {p.lugar}</p> : null}
                {p.foto_url ? (
                  <img
                    src={p.foto_url}
                    alt="Foto de la publicación"
                    className="mt-3 max-h-64 rounded-lg border border-stone-200 object-contain"
                  />
                ) : p.tiene_foto ? (
                  <p className="mt-2 text-sm text-stone-600">La foto no se pudo cargar.</p>
                ) : null}
              </Tarjeta>
            ))}
          </ul>
        </>
      ) : null}

      {c.comentarios.length > 0 ? (
        <>
          <h3 className="mt-8 text-lg font-semibold">Comentarios</h3>
          <ul className="mt-3 space-y-4">
            {c.comentarios.map((co) => (
              <Tarjeta
                key={co.id}
                {...propsComunes("comentarios", co.id, co.autor)}
                titulo={co.en_publicacion ? "Comentario en una publicación" : "Comentario en un negocio"}
                meta={`${idCorto(co.autor)} · ${fecha(co.creado_en)}`}
                reportes={co.reportes}
                revisadoEn={co.revisado_en}
              >
                <p className="mt-2">{co.texto}</p>
              </Tarjeta>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
