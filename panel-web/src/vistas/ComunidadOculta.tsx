/**
 * Vista. Publicaciones y comentarios ocultos por reportes: «Mostrar», «Borrar»
 * y, dentro de «Ver reportes», bloquear al autor.
 */
import { Fragment, useState } from "react";
import { useComunidadOculta } from "../controladores/useComunidadOculta";
import { enZona } from "../controladores/usePendientes";
import type { ReporteComunidad, TablaComunidad } from "../modelos/comunidadOculta";
import { usePanel } from "./contexto";
import { categoriaPublicacion, cuando, idCorto, motivoComunidad, nombrePersona } from "./etiquetas";
import { Acciones, DetalleReportes, Motivos, ocultoDesde, SelectorBloqueo } from "./moderacion";
import { Aviso, Celda, Cuerpo, Encabezado, Estado, Pill, Tabla, Vacio, type Tono } from "./ui";

const TONO_CATEGORIA: Record<string, Tono> = {
  seguridad: "azul",
  ayuda_social: "verde",
  donacion: "verde",
  kermes: "naranja",
  misa: "morado",
  taller: "morado",
};

interface Fila {
  tabla: TablaComunidad;
  id: string;
  texto: string | null;
  autor: string;
  autorNombre: string | null;
  zona: string | null;
  categoria: string | null;
  donde: string | null;
  fotoUrl: string | null;
  tieneFoto: boolean;
  reportes: ReporteComunidad[];
  revisadoEn: string | null;
  creadoEn: string;
}

export function ComunidadOculta() {
  const { zona } = usePanel();
  const c = useComunidadOculta();
  const [pestana, setPestana] = useState<TablaComunidad>("publicaciones");
  const [abierto, setAbierto] = useState<string | null>(null);
  const filtro = enZona(zona);

  const publicaciones: Fila[] = c.publicaciones.filter(filtro).map((p) => ({
    tabla: "publicaciones",
    id: p.id,
    texto: p.mensaje,
    autor: p.autor,
    autorNombre: p.autor_nombre ?? null,
    zona: p.zona,
    categoria: p.categoria,
    donde: null,
    fotoUrl: p.foto_url,
    tieneFoto: p.tiene_foto,
    reportes: p.reportes,
    revisadoEn: p.revisado_en,
    creadoEn: p.creado_en,
  }));
  const comentarios: Fila[] = c.comentarios.filter(filtro).map((co) => ({
    tabla: "comentarios",
    id: co.id,
    texto: co.texto,
    autor: co.autor,
    autorNombre: co.autor_nombre ?? null,
    zona: co.zona,
    categoria: null,
    donde: co.en_publicacion ? "En una publicación" : "En un negocio",
    fotoUrl: null,
    tieneFoto: false,
    reportes: co.reportes,
    revisadoEn: co.revisado_en,
    creadoEn: co.creado_en,
  }));
  const filas = pestana === "publicaciones" ? publicaciones : comentarios;
  const nombreTipo = pestana === "publicaciones" ? "esta publicación" : "este comentario";

  return (
    <>
      <Encabezado titulo="Comunidad oculta" subtitulo="Publicaciones y comentarios ocultos por reportes" />
      <Cuerpo>
        <div role="tablist" aria-label="Tipo de contenido" className="flex flex-wrap gap-3">
          {(
            [
              ["publicaciones", `Publicaciones · ${publicaciones.length}`],
              ["comentarios", `Comentarios · ${comentarios.length}`],
            ] as const
          ).map(([id, texto]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={pestana === id}
              onClick={() => {
                setPestana(id);
                setAbierto(null);
              }}
              className={`rounded-full border px-5 py-2.5 font-titulo text-[16px] font-semibold transition-colors ${
                pestana === id ? "border-marca bg-marca text-white" : "border-marca bg-superficie text-marca hover:bg-marca-suave"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        <Estado cargando={c.cargando} error={c.error} aviso={c.aviso} onRecargar={() => void c.recargar()} />

        {!c.cargando && !c.error && filas.length === 0 ? (
          <Vacio>
            No hay {pestana === "publicaciones" ? "publicaciones ocultas" : "comentarios ocultos"}
            {zona ? ` en ${zona}` : ""}.
          </Vacio>
        ) : null}

        {filas.length > 0 ? (
          <Tabla
            etiqueta={pestana === "publicaciones" ? "Publicaciones ocultas" : "Comentarios ocultos"}
            columnas={[pestana === "publicaciones" ? "Publicación" : "Comentario", pestana === "publicaciones" ? "Categoría" : "Dónde", "Motivos", "Oculta desde", "Acción"]}
          >
            {filas.map((f) => {
              const clave = `${f.tabla}:${f.id}`;
              const verReportes = abierto === clave;
              const autor = nombrePersona(f.autorNombre, f.autor);
              const bloqueado = c.bloqueados.has(f.autor);
              return (
                <Fragment key={clave}>
                  <tr>
                    <Celda className="max-w-sm">
                      <span className="block text-[16px]">
                        {f.texto ? `«${f.texto}»` : f.tieneFoto ? "(Solo foto)" : "(Sin texto)"}
                      </span>
                      <span className="mt-1 block text-sm text-tinta-2">
                        Publicó: {autor}
                        {f.zona ? ` · ${f.zona}` : ""}
                      </span>
                    </Celda>
                    <Celda>
                      {f.categoria ? (
                        <Pill tono={TONO_CATEGORIA[f.categoria] ?? "gris"}>{categoriaPublicacion(f.categoria)}</Pill>
                      ) : (
                        <span className="text-[15px] text-tinta-2">{f.donde}</span>
                      )}
                    </Celda>
                    <Celda>
                      <Motivos reportes={f.reportes} etiqueta={motivoComunidad} />
                    </Celda>
                    <Celda className="whitespace-nowrap">{cuando(ocultoDesde(f.reportes, f.creadoEn))}</Celda>
                    <Celda>
                      <Acciones
                        nombre={nombreTipo}
                        ocupado={c.enCurso !== null}
                        guardando={c.enCurso === f.id}
                        abierto={verReportes}
                        onMostrar={() => void c.mostrar(f.tabla, f.id)}
                        onBorrar={() => {
                          if (window.confirm(`¿Borrar ${nombreTipo}? También se borran sus reportes. No se puede deshacer.`)) {
                            void c.borrar(f.tabla, f.id);
                          }
                        }}
                        onVerReportes={() => setAbierto(verReportes ? null : clave)}
                      />
                    </Celda>
                  </tr>
                  {verReportes ? (
                    <tr>
                      <td colSpan={5} className="px-4 pb-4">
                        <DetalleReportes reportes={f.reportes} revisadoEn={f.revisadoEn} etiqueta={motivoComunidad}>
                          {f.fotoUrl ? (
                            <img
                              src={f.fotoUrl}
                              alt="Foto de la publicación"
                              className="mt-4 max-h-64 rounded-lg border border-borde object-contain"
                            />
                          ) : f.tieneFoto ? (
                            <p className="mt-3 text-sm text-tinta-2">La foto no se pudo cargar.</p>
                          ) : null}
                          <div className="mt-4 border-t border-borde pt-4">
                            <p className="mb-2 font-titulo text-[15px] font-semibold">
                              Autor: {autor} <span className="font-mono text-xs text-tinta-3">{idCorto(f.autor)}</span>
                            </p>
                            {bloqueado ? (
                              <Pill tono="gris">Autor bloqueado</Pill>
                            ) : (
                              <SelectorBloqueo
                                compacto
                                persona={autor}
                                ocupado={c.enCurso !== null}
                                guardando={c.enCurso === f.autor}
                                onBloquear={(motivo) => void c.bloquearAutor(f.autor, motivo)}
                              />
                            )}
                          </div>
                        </DetalleReportes>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </Tabla>
        ) : null}

        <Aviso>Al volver a mostrar, la base guarda la fecha de revisión y los reportes anteriores dejan de contar.</Aviso>
      </Cuerpo>
    </>
  );
}
