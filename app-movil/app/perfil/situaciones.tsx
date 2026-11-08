/**
 * Vista. B4 · ¿Algo de esto te pasa? (Mockup v4, p. 11).
 * Seis tarjetas de selección múltiple; «Ninguna» excluye a las demás. «Guardar» vuelve a Mis datos.
 * Solo en el teléfono (datos de salud, INC-37).
 */
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { guardarSituaciones, leerSituaciones, alternarSituacion, type Situacion } from "../../src/modelos/local/situaciones";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Opciones } from "../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { SITUACIONES } from "../../src/vistas/componentes/estiloSituaciones";
import { ajustarVozPorSituaciones } from "../../src/controladores/useEscuchar";


export default function AlgoTePasa() {
  const [seleccion, setSeleccion] = useState<Situacion[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    void leerSituaciones().then(setSeleccion);
  }, []);

  const cambiar = (nueva: Situacion[]) => {
    // Opciones devuelve la lista con un valor agregado o quitado; se aplica la regla de «Ninguna».
    const agregada = nueva.find((s) => !seleccion.includes(s));
    const quitada = seleccion.find((s) => !nueva.includes(s));
    const tocada = agregada ?? quitada;
    if (tocada) setSeleccion(alternarSituacion(seleccion, tocada));
  };

  const guardar = async () => {
    setGuardando(true);
    ajustarVozPorSituaciones(seleccion);
    await guardarSituaciones(seleccion);
    setGuardando(false);
    router.back();
  };

  return (
    <Pantalla
      titulo="¿Algo de esto te pasa?"
      volver
      textoEscuchar="¿Algo de esto te pasa? Vivo solo, oigo poco, veo poco, camino poco, tomo pastillas o ninguna. Puedes elegir varias. Luego toca Guardar."
      pie={
        <BotonPrincipal variante="listo" icono="check" cargando={guardando} onPress={() => void guardar()}>
          Guardar
        </BotonPrincipal>
      }
    >
      <Opciones
        multiple
        tarjetas
        columnas={2}
        nombre="¿Algo de esto te pasa?"
        opciones={SITUACIONES}
        seleccion={seleccion}
        onCambiar={cambiar}
      />
    </Pantalla>
  );
}
