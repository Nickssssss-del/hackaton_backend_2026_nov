/**
 * Vista. «Saliste de casa» (A5/B3, «Avisarles cuando salgo de casa»).
 * Se abre al tocar la notificación de la geocerca. Un botón grande prepara el SMS a las personas de
 * confianza con la hora y la ubicación; la persona toca Enviar en Mensajes. Nunca dice «enviado».
 */
import { router } from "expo-router";
import { useState } from "react";
import { prepararMensajeSalida } from "../src/controladores/salidaDeCasa";
import { BotonPrincipal } from "../src/vistas/componentes/BotonPrincipal";
import { Mensaje } from "../src/vistas/componentes/Mensaje";
import { Pantalla } from "../src/vistas/componentes/Pantalla";
import { Texto } from "../src/vistas/componentes/Texto";

export default function SalisteDeCasa() {
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<{ tono: "info" | "aviso"; texto: string } | null>(null);

  const avisar = async () => {
    setOcupado(true);
    const r = await prepararMensajeSalida();
    setOcupado(false);
    setResultado(
      "problema" in r
        ? { tono: "aviso", texto: r.problema }
        : { tono: "info", texto: `Se abrió Mensajes para ${r.nombres.join(" y ")}. Toca Enviar.` },
    );
  };

  return (
    <Pantalla
      titulo="Saliste de casa"
      volver={() => router.replace("/principal")}
      textoEscuchar="Saliste de casa. ¿Avisamos a tus personas de confianza? Toca Avisar a mis contactos, o No hace falta."
      pie={
        <>
          <BotonPrincipal variante="listo" icono="message-text-outline" cargando={ocupado} onPress={() => void avisar()}>
            Avisar a mis contactos
          </BotonPrincipal>
          <BotonPrincipal variante="neutro" onPress={() => router.replace("/principal")}>
            No hace falta
          </BotonPrincipal>
        </>
      }
    >
      <Texto variante="subtitulo">¿Avisamos a tus personas de confianza que saliste?</Texto>
      <Texto>Les mandaremos la hora y dónde estás.</Texto>
      {resultado ? <Mensaje tono={resultado.tono}>{resultado.texto}</Mensaje> : null}
      <Texto variante="ayuda">Puedes apagar este aviso en Mis datos › Avisar si salgo de casa.</Texto>
    </Pantalla>
  );
}
