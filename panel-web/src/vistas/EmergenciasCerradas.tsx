/**
 * Vista. Emergencias cerradas de los últimos 7 días: cómo terminaron y qué vecinos
 * vieron los datos, para revisar abusos. La base ya borró nombre, dirección y ubicación.
 */
import { useEmergenciasCerradas } from "../controladores/useEmergenciasCerradas";
import { enZona } from "../controladores/usePendientes";
import { usePanel } from "./contexto";
import { diaSemanaMes, hora, idCorto } from "./etiquetas";
import { Aviso, Celda, Cuerpo, Encabezado, Estado, Pill, Tabla, Vacio } from "./ui";

export function EmergenciasCerradas() {
  const { zona } = usePanel();
  const { emergencias, cargando, error, recargar } = useEmergenciasCerradas();
  const visibles = emergencias.filter(enZona(zona));

  return (
    <>
      <Encabezado titulo="Emergencias cerradas" subtitulo="Últimos 7 días · para revisar abusos de quien vio los datos" />
      <Cuerpo>
        <Aviso tono="ambar">
          Al cerrar, la base borró nombre, dirección y ubicación exacta. Aquí solo queda quién vio los datos y cuándo.
          Todo se borra a los 7 días.
        </Aviso>
        <Estado cargando={cargando} error={error} onRecargar={() => void recargar()} />
        {!cargando && !error && visibles.length === 0 ? (
          <Vacio>No hubo emergencias cerradas en los últimos 7 días{zona ? ` en ${zona}` : ""}.</Vacio>
        ) : null}
        {visibles.length > 0 ? (
          <Tabla
            etiqueta="Emergencias cerradas"
            columnas={["Código", "Zona", "Inicio y cierre", "Cómo terminó", "Vecinos que vieron los datos"]}
          >
            {visibles.map((e) => (
              <tr key={e.id}>
                <Celda className="font-titulo font-bold">
                  {e.codigo}
                  {e.practica ? (
                    <span className="mt-1 block">
                      <Pill tono="ambar">Práctica</Pill>
                    </span>
                  ) : null}
                </Celda>
                <Celda>{e.zona ?? "Sin zona"}</Celda>
                <Celda>
                  <span className="block">
                    {diaSemanaMes(e.creado_en)} · {hora(e.creado_en)}
                  </span>
                  <span className="block text-sm text-tinta-2">cerró {hora(e.cerrada_en)}</span>
                </Celda>
                <Celda>
                  {e.termino === "estoy_bien" ? <Pill tono="verde">Estoy bien</Pill> : <Pill tono="gris">Venció</Pill>}
                </Celda>
                <Celda>
                  {e.vieron.length === 0 ? (
                    <span className="text-tinta-2">Nadie vio los datos</span>
                  ) : (
                    <ul className="space-y-2">
                      {e.vieron.map((v) => (
                        <li key={v.vecino_id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="font-titulo font-semibold">
                            {v.nombre ?? <span className="font-mono text-sm">{idCorto(v.vecino_id)}</span>}
                          </span>
                          <span className="text-tinta-2">vio datos {hora(v.vio_datos_en)}</span>
                          {v.reportado ? <Pill tono="rojo">Reportado</Pill> : <Pill tono="verde">Sin reportes</Pill>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Celda>
              </tr>
            ))}
          </Tabla>
        ) : null}
      </Cuerpo>
    </>
  );
}
