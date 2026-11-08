/**
 * Vista. ¿Cuál es tu celular? Se pide solo al publicar, pedir ayuda o dar visto bueno
 * (decisión del equipo), nunca en el registro. Se guarda en el teléfono; la nube lo recibe
 * recién al enviar el pedido (perfiles.celular, como antes).
 */
import { router } from "expo-router";
import { useState } from "react";
import { guardarCelular, validarCelular } from "../../src/controladores/useAyudaVecinos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";

export default function TuCelular() {
  const [celular, setCelular] = useState("");
  const [guardando, setGuardando] = useState(false);
  const problema = validarCelular(celular);

  const guardar = async () => {
    setGuardando(true);
    await guardarCelular(celular);
    setGuardando(false);
    router.back();
  };

  return (
    <Pantalla
      titulo="Tu celular"
      volver
      textoEscuchar="Para que te puedan contactar, ¿cuál es tu celular? Son nueve números y empieza con nueve."
      pie={
        <BotonPrincipal variante="listo" icono="check" cargando={guardando} motivoDesactivado={problema} onPress={() => void guardar()}>
          Guardar y seguir
        </BotonPrincipal>
      }
    >
      <Texto variante="subtitulo">Para que te puedan contactar, ¿cuál es tu celular?</Texto>
      <CampoConVoz
        etiqueta="Celular"
        ayuda="987 654 321"
        valor={celular}
        onCambiar={(t) => setCelular(t.replace(/[^\d ]/g, ""))}
        maxLength={11}
        teclado="phone-pad"
        digitos={9}
        completo={problema === null}
      />
      <Mensaje tono="info">Solo lo verá el vecino que te ayude o al que tú ayudes.</Mensaje>
    </Pantalla>
  );
}
