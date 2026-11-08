/**
 * Vista. Grupos de apoyo: primero los que faltan verificar.
 * (No está en el mockup; se conserva del panel anterior con el estilo nuevo.)
 */
import { enZona } from "../controladores/usePendientes";
import { useGrupos } from "../controladores/useGrupos";
import { usePanel } from "./contexto";
import { tipoGrupo } from "./etiquetas";
import { Aviso, Boton, Celda, Cuerpo, Encabezado, Estado, Pill, Tabla, Vacio } from "./ui";

export function GruposApoyo() {
  const { zona } = usePanel();
  const { grupos, cargando, error, aviso, enCurso, recargar, verificar } = useGrupos();
  const visibles = grupos.filter(enZona(zona));

  return (
    <>
      <Encabezado titulo="Grupos de apoyo" subtitulo="Brigadas, postas y puntos seguros · los vecinos ven la marca «Verificado»" />
      <Cuerpo>
        <Estado cargando={cargando} error={error} aviso={aviso} onRecargar={() => void recargar()} />
        {!cargando && !error && visibles.length === 0 ? <Vacio>No hay grupos de apoyo{zona ? ` en ${zona}` : ""}.</Vacio> : null}
        {visibles.length > 0 ? (
          <Tabla etiqueta="Grupos de apoyo" columnas={["Grupo", "Zona", "Contacto", "Estado"]}>
            {visibles.map((g) => (
              <tr key={g.id}>
                <Celda>
                  <span className="block font-titulo font-semibold">{g.nombre}</span>
                  <span className="block text-[15px] text-tinta-2">{tipoGrupo(g.tipo)}</span>
                </Celda>
                <Celda>{g.zona ?? "Sin zona"}</Celda>
                <Celda>
                  <span className="block">{g.contacto ?? "—"}</span>
                  {g.direccion ? <span className="block text-sm text-tinta-2">{g.direccion}</span> : null}
                </Celda>
                <Celda>
                  {g.verificada ? (
                    <Pill tono="verde">Verificado</Pill>
                  ) : (
                    <Boton
                      variante="primario"
                      disabled={enCurso !== null}
                      onClick={() => void verificar(g.id)}
                      aria-label={`Marcar como verificado: ${g.nombre}`}
                    >
                      {enCurso === g.id ? "Guardando…" : "Marcar como verificado"}
                    </Boton>
                  )}
                </Celda>
              </tr>
            ))}
          </Tabla>
        ) : null}
        <Aviso>Verifica un grupo solo después de confirmar por teléfono que existe y atiende.</Aviso>
      </Cuerpo>
    </>
  );
}
