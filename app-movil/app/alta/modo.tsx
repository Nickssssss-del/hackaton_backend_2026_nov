/**
 * Vista. A2 · ¿Cómo quieres usar Vecinos? (Mockup v4, p. 2).
 * Modo sencillo → Inicio del adulto mayor (B1). Modo completo → Inicio del vecino (B2).
 * Nadie tiene que decir su edad para elegir. Se cambia luego en Mis datos.
 * Toda la tarjeta es táctil; al tocarla se guarda el modo y se pasa a A3.
 */
import { router, useLocalSearchParams } from "expo-router";
import { usePreferencias } from "../../src/controladores/PreferenciasContexto";
import type { ModoUso } from "../../src/modelos/local/preferencias";
import { Ilustracion } from "../../src/vistas/componentes/Ilustracion";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { TarjetaAcceso } from "../../src/vistas/componentes/TarjetaAcceso";
import { Texto } from "../../src/vistas/componentes/Texto";

export default function ElegirModo() {
  const { modo, setModo, tamano, setTamano } = usePreferencias();
  // Desde Mis datos (B3): «Cambiar de modo» vuelve atrás en lugar de seguir el registro.
  const editando = useLocalSearchParams<{ editar?: string }>().editar === "1";

  const elegir = (elegido: ModoUso) => {
    setModo(elegido);
    // «Letra grande»: si la persona no cambió la letra todavía, el modo sencillo empieza en Grande.
    if (elegido === "sencillo" && tamano === "normal") setTamano("grande");
    if (editando) router.back();
    else router.push("/alta/ubicacion");
  };

  return (
    <Pantalla
      titulo="¿Cómo quieres usar Vecinos?"
      volver
      textoEscuchar="¿Cómo quieres usar Vecinos? Modo sencillo: letra grande y pocos botones. Modo completo: todo, y puedes subir tu negocio. Puedes cambiarlo cuando quieras."
    >
      <TarjetaAcceso
        titulo="Modo sencillo"
        subtitulo="Letra grande y pocos botones"
        encima={<Ilustracion tipo="modoSencillo" alto={120} />}
        seleccionada={modo === "sencillo"}
        onPress={() => elegir("sencillo")}
      />
      <TarjetaAcceso
        titulo="Modo completo"
        subtitulo="Todo, y puedes subir tu negocio"
        encima={<Ilustracion tipo="modoCompleto" alto={120} />}
        seleccionada={modo === "completo"}
        onPress={() => elegir("completo")}
      />
      <Texto variante="ayuda" centrado>Puedes cambiarlo cuando quieras.</Texto>
    </Pantalla>
  );
}
