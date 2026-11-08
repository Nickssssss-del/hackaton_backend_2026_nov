/**
 * Vista. Servicios ocultos por reportes de vecinos: «Mostrar» o «Borrar».
 */
import { Fragment, useState } from "react";
import { enZona } from "../controladores/usePendientes";
import { useServiciosOcultos } from "../controladores/useServiciosOcultos";
import { usePanel } from "./contexto";
import { cuando, motivoReporte, oficio } from "./etiquetas";
import { Acciones, DetalleReportes, Motivos, ocultoDesde } from "./moderacion";
import { Aviso, Celda, Cuerpo, Encabezado, Estado, Tabla, Vacio } from "./ui";

export function ServiciosOcultos() {
  const { zona } = usePanel();
  const { servicios, cargando, error, aviso, enCurso, recargar, mostrar, borrar } = useServiciosOcultos();
  const [abierto, setAbierto] = useState<string | null>(null);
  const visibles = servicios.filter(enZona(zona));

  const confirmarBorrado = (id: string, nombre: string) => {
    if (window.confirm(`¿Borrar «${nombre}»? También se borran sus reportes y vistos buenos. No se puede deshacer.`)) {
      void borrar(id);
    }
  };

  return (
    <>
      <Encabezado titulo="Servicios ocultos" subtitulo="Se ocultaron solos por reportes de vecinos · decide si vuelven o se borran" />
      <Cuerpo>
        <Estado cargando={cargando} error={error} aviso={aviso} onRecargar={() => void recargar()} />
        {!cargando && !error && visibles.length === 0 ? (
          <Vacio>No hay servicios ocultos{zona ? ` en ${zona}` : ""}.</Vacio>
        ) : null}
        {visibles.length > 0 ? (
          <Tabla etiqueta="Servicios ocultos" columnas={["Negocio", "Zona", "Motivos", "Oculto desde", "Acción"]}>
            {visibles.map((s) => {
              const nombre = s.nombre_negocio ?? oficio(s.oficio);
              const verReportes = abierto === s.id;
              return (
                <Fragment key={s.id}>
                  <tr>
                    <Celda>
                      <span className="block font-titulo font-semibold">{nombre}</span>
                      <span className="block text-[15px] text-tinta-2">{oficio(s.oficio)}</span>
                    </Celda>
                    <Celda>{s.zona ?? "Sin zona"}</Celda>
                    <Celda>
                      <Motivos reportes={s.reportes} etiqueta={motivoReporte} />
                    </Celda>
                    <Celda className="whitespace-nowrap">{cuando(ocultoDesde(s.reportes, s.creado_en))}</Celda>
                    <Celda>
                      <Acciones
                        nombre={nombre}
                        ocupado={enCurso !== null}
                        guardando={enCurso === s.id}
                        abierto={verReportes}
                        onMostrar={() => void mostrar(s.id)}
                        onBorrar={() => confirmarBorrado(s.id, nombre)}
                        onVerReportes={() => setAbierto(verReportes ? null : s.id)}
                      />
                    </Celda>
                  </tr>
                  {verReportes ? (
                    <tr>
                      <td colSpan={5} className="px-4 pb-4">
                        {s.descripcion ? <p className="mb-3 text-[15px] text-tinta-2">«{s.descripcion}»</p> : null}
                        <DetalleReportes reportes={s.reportes} revisadoEn={s.revisado_en} etiqueta={motivoReporte} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </Tabla>
        ) : null}
        <Aviso>«Mostrar» lo devuelve a la lista de los vecinos y los reportes anteriores dejan de contar. «Borrar» lo elimina para siempre.</Aviso>
      </Cuerpo>
    </>
  );
}
