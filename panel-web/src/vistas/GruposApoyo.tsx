/**
 * Vista. Grupos de apoyo: primero los que faltan verificar.
 * Crear y editar no marcan el grupo como verificado.
 */
import { useState } from "react";
import { useGrupos } from "../controladores/useGrupos";
import type { DatosGrupo, GrupoApoyo } from "../modelos/grupos";
import { Cargando } from "./Cargando";
import { tipoGrupo } from "./etiquetas";
import { Mensajes } from "./Mensajes";

const TIPOS = ["brigada", "bomberos", "comisaria", "salud", "municipalidad", "punto_seguro", "otro"] as const;

const VACIO: DatosGrupo = { nombre: "", tipo: "brigada", zona_id: null, contacto: null, direccion: null };

const campo = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 font-normal text-stone-900";

function datosDe(grupo: GrupoApoyo): DatosGrupo {
  return {
    nombre: grupo.nombre,
    tipo: grupo.tipo,
    zona_id: grupo.zona_id,
    contacto: grupo.contacto,
    direccion: grupo.direccion,
  };
}

function FormularioGrupo({
  titulo,
  inicial,
  zonas,
  guardando,
  onGuardar,
  onCancelar,
}: {
  titulo: string;
  inicial: DatosGrupo;
  zonas: { id: string; nombre: string }[];
  guardando: boolean;
  onGuardar: (datos: DatosGrupo) => Promise<boolean>;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [tipo, setTipo] = useState(inicial.tipo);
  const [zonaId, setZonaId] = useState(inicial.zona_id ?? "");
  const [contacto, setContacto] = useState(inicial.contacto ?? "");
  const [direccion, setDireccion] = useState(inicial.direccion ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-4 space-y-3 rounded-2xl border border-stone-300 bg-stone-50 p-4"
      noValidate
      onSubmit={async (evento) => {
        evento.preventDefault();
        const nombreLimpio = nombre.trim();
        if (nombreLimpio.length < 2 || nombreLimpio.length > 80) {
          setError("El nombre es obligatorio y puede tener hasta 80 caracteres.");
          return;
        }
        if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) {
          setError("Elige un tipo de la lista.");
          return;
        }
        if (contacto.trim().length > 20) {
          setError("El contacto puede tener hasta 20 caracteres.");
          return;
        }
        if (direccion.trim().length > 100) {
          setError("La referencia puede tener hasta 100 caracteres.");
          return;
        }
        setError(null);
        const guardado = await onGuardar({
          nombre: nombreLimpio,
          tipo,
          zona_id: zonaId || null,
          contacto: contacto.trim() || null,
          direccion: direccion.trim() || null,
        });
        if (guardado) onCancelar();
      }}
    >
      <h3 className="text-lg font-semibold">{titulo}</h3>
      <label className="block text-base font-medium">
        Nombre
        <input
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          maxLength={80}
          required
          className={campo}
        />
      </label>
      <label className="block text-base font-medium">
        Tipo
        <select value={tipo} onChange={(evento) => setTipo(evento.target.value)} className={campo}>
          {TIPOS.map((codigo) => (
            <option key={codigo} value={codigo}>
              {tipoGrupo(codigo)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-base font-medium">
        Zona
        <select value={zonaId} onChange={(evento) => setZonaId(evento.target.value)} className={campo}>
          <option value="">Sin zona</option>
          {zonas.map((zona) => (
            <option key={zona.id} value={zona.id}>
              {zona.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-base font-medium">
        Contacto
        <input
          value={contacto}
          onChange={(evento) => setContacto(evento.target.value)}
          maxLength={20}
          className={campo}
        />
        <span className="mt-1 block font-normal text-stone-700">
          Usa el número de la brigada o del punto, no el celular personal de una persona.
        </span>
      </label>
      <label className="block text-base font-medium">
        Referencia
        <input
          value={direccion}
          onChange={(evento) => setDireccion(evento.target.value)}
          maxLength={100}
          className={campo}
        />
      </label>
      {error ? <p className="text-base text-red-800">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="rounded-full bg-[#1F4E9C] px-4 py-2 text-base font-medium text-white hover:bg-[#163a74] disabled:bg-stone-300 disabled:text-stone-700"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-full border border-stone-400 px-4 py-2 text-base font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function GruposApoyo() {
  const { grupos, zonas, cargando, error, aviso, enCurso, recargar, verificar, crear, editar, borrar } = useGrupos();
  const [formulario, setFormulario] = useState<"nuevo" | string | null>(null);
  const guardando = enCurso !== null;

  const confirmarBorrado = (id: string, nombre: string) => {
    if (window.confirm(`¿Borrar «${nombre}»? No se puede deshacer.`)) void borrar(id);
  };

  return (
    <section aria-labelledby="titulo-grupos">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-grupos" className="text-3xl font-bold text-stone-900">
            Grupos de apoyo
          </h2>
          <p className="mt-1 text-base text-stone-600">
            Grupos de ayuda entre vecinos. La marca «Verificado» aparece en los que confirmó el equipo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormulario("nuevo")}
          className="rounded-full border border-stone-400 px-4 py-2 text-base font-medium"
        >
          Nuevo grupo
        </button>
      </div>

      {cargando || guardando ? <Cargando /> : null}
      <Mensajes cargando={false} error={error} aviso={aviso} onRecargar={() => void recargar()} />

      {formulario === "nuevo" ? (
        <FormularioGrupo
          key="nuevo"
          titulo="Nuevo grupo"
          inicial={VACIO}
          zonas={zonas}
          guardando={guardando}
          onGuardar={crear}
          onCancelar={() => setFormulario(null)}
        />
      ) : null}

      {!cargando && !error && grupos.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-stone-300 bg-stone-100 p-4 text-base text-stone-800">
          No hay grupos de apoyo.
        </p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {grupos.map((grupo) => (
          <li key={grupo.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{grupo.nombre}</h3>
                <p className="mt-1 text-base text-stone-700">
                  {tipoGrupo(grupo.tipo)}
                  {grupo.zona ? ` · ${grupo.zona}` : ""}
                  {grupo.contacto ? ` · ${grupo.contacto}` : ""}
                </p>
                {grupo.direccion ? <p className="mt-1 text-base text-stone-700">{grupo.direccion}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => setFormulario(grupo.id)}
                  className="rounded-full border border-stone-400 px-4 py-2 text-base font-medium disabled:bg-stone-300 disabled:text-stone-700"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => confirmarBorrado(grupo.id, grupo.nombre)}
                  aria-label={`Borrar ${grupo.nombre}`}
                  className="rounded-full border border-stone-400 px-4 py-2 text-base font-medium disabled:bg-stone-300 disabled:text-stone-700"
                >
                  Borrar
                </button>
                {grupo.verificada ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-base font-medium text-emerald-900">
                    ✓ Verificado
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => void verificar(grupo.id)}
                    aria-label={`Marcar como verificada: ${grupo.nombre}`}
                    className="rounded-full bg-[#1F4E9C] px-4 py-2 text-base font-medium text-white hover:bg-[#163a74] disabled:bg-stone-300 disabled:text-stone-700"
                  >
                    {enCurso === grupo.id ? "Guardando…" : "Marcar como verificada"}
                  </button>
                )}
              </div>
            </div>
            {formulario === grupo.id ? (
              <FormularioGrupo
                key={grupo.id}
                titulo="Editar grupo"
                inicial={datosDe(grupo)}
                zonas={zonas}
                guardando={guardando}
                onGuardar={(datos) => editar(grupo.id, datos)}
                onCancelar={() => setFormulario(null)}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
