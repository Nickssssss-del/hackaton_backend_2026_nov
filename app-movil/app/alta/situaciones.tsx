/**
 * Vista. Registro, paso 4 de 4 · ¿Algo de esto te pasa? (B4 dentro del registro, pedido del equipo).
 * Va después de «A quién avisamos» y antes de «¡Todo listo!». Hay que elegir al menos una
 * opción («Ninguna» también vale): así el Inicio muestra lo que le pasa a la persona debajo de su
 * nombre, sobre todo en el modo sencillo. Solo en el teléfono (datos de salud).
 */
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ajustarVozPorSituaciones } from "../../src/controladores/useEscuchar";
import { alternarSituacion, guardarSituaciones, leerSituaciones, type Situacion } from "../../src/modelos/local/situaciones";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { SITUACIONES } from "../../src/vistas/componentes/estiloSituaciones";
import { IndicadorPasos } from "../../src/vistas/componentes/IndicadorPasos";
import { Opciones } from "../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";

export default function AltaSituaciones() {
  const [seleccion, setSeleccion] = useState<Situacion[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    void leerSituaciones().then(setSeleccion);
  }, []);

  const cambiar = (nueva: Situacion[]) => {
    const tocada = nueva.find((s) => !seleccion.includes(s)) ?? seleccion.find((s) => !nueva.includes(s));
    if (tocada) setSeleccion(alternarSituacion(seleccion, tocada));
  };

  const seguir = async () => {
    setGuardando(true);
    ajustarVozPorSituaciones(seleccion);
    await guardarSituaciones(seleccion);
    setGuardando(false);
    router.push("/alta/listo");
  };

  return (
    <Pantalla
      titulo="¿Algo de esto te pasa?"
      volver
      encabezado={<IndicadorPasos paso={4} />}
      textoEscuchar="Paso 4 de 4. ¿Algo de esto te pasa? Vivo solo, oigo poco, veo poco, camino poco, tomo pastillas o ninguna. Puedes elegir varias. Luego toca Seguir."
      pie={
        <BotonPrincipal
          icono="chevron-right"
          cargando={guardando}
          motivoDesactivado={seleccion.length > 0 ? null : "Elige al menos una, o «Ninguna»"}
          onPress={() => void seguir()}
        >
          Seguir
        </BotonPrincipal>
      }
    >
      <Texto variante="ayuda">Así la app se adapta a ti y tus vecinos saben cómo ayudarte. Lo puedes cambiar después.</Texto>
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
