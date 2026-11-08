/**
 * Vista. Confirmar mi celular con un código por SMS.
 * El backend lo exige para ofrecer ayuda a un vecino (yo_ayudo) y para ver o responder una alerta
 * vecinal (ver_alerta, voy_a_ayudar). Dos pasos grandes y claros: celular → código de 6 números.
 */
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useVerificarCelular } from "../../src/controladores/useCuenta";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";

export default function VerificarCelular() {
  const v = useVerificarCelular();
  const [codigo, setCodigo] = useState("");
  const { cargarCelular } = v;

  useFocusEffect(
    useCallback(() => {
      void cargarCelular();
    }, [cargarCelular]),
  );

  if (v.paso === "listo") {
    return (
      <Pantalla
        titulo="Celular confirmado"
        volver
        textoEscuchar="Listo. Tu celular quedó confirmado. Ya puedes ayudar a tus vecinos y recibir sus alertas."
        pie={
          <BotonPrincipal variante="listo" icono="check" onPress={() => router.back()}>
            Seguir
          </BotonPrincipal>
        }
      >
        <Mensaje tono="listo">Listo. Tu celular quedó confirmado.</Mensaje>
        <Texto>Ya puedes ayudar a tus vecinos y recibir sus alertas.</Texto>
      </Pantalla>
    );
  }

  if (v.paso === "codigo") {
    const completo = /^\d{6}$/.test(codigo);
    return (
      <Pantalla
        titulo="Escribe el código"
        volver={() => v.setPaso("celular")}
        textoEscuchar={`Te enviamos un mensaje al ${v.celular} con un código de seis números. Escríbelo o dilo.`}
        pie={
          <>
            <BotonPrincipal
              variante="listo"
              icono="check"
              cargando={v.ocupado}
              motivoDesactivado={completo ? null : "Faltan números"}
              onPress={() => void v.confirmar(codigo)}
            >
              Confirmar
            </BotonPrincipal>
            <BotonPrincipal variante="neutro" icono="message-reply-text-outline" onPress={() => void v.enviarCodigo()}>
              Enviar otro código
            </BotonPrincipal>
          </>
        }
      >
        <Texto variante="subtitulo">{`Te enviamos un código al ${v.celular}`}</Texto>
        <CampoConVoz
          etiqueta="Código de 6 números"
          ayuda="123456"
          valor={codigo}
          onCambiar={(t) => setCodigo(t.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          teclado="number-pad"
          completo={completo}
        />
        {v.error ? <Mensaje tono="aviso">{v.error}</Mensaje> : null}
        <Mensaje tono="info">Nunca compartas este código con nadie, ni con quien diga ser del equipo.</Mensaje>
      </Pantalla>
    );
  }

  return (
    <Pantalla
      titulo="Confirma tu celular"
      volver
      textoEscuchar="Para ayudar a tus vecinos y recibir sus alertas, confirma tu celular. Te enviaremos un mensaje con un código."
      pie={
        <BotonPrincipal variante="tocar" icono="message-text-outline" cargando={v.ocupado} onPress={() => void v.enviarCodigo()}>
          Enviarme el código
        </BotonPrincipal>
      }
    >
      <Texto variante="subtitulo">Para ayudar a tus vecinos y recibir sus alertas, confirma tu celular.</Texto>
      <CampoConVoz
        etiqueta="Tu celular"
        ayuda="987 654 321"
        valor={v.celular}
        onCambiar={(t) => v.setCelular(t.replace(/[^\d ]/g, ""))}
        maxLength={11}
        teclado="phone-pad"
        completo={/^9\d{8}$/.test(v.celular.replace(/\D/g, ""))}
      />
      {v.error ? <Mensaje tono="aviso">{v.error}</Mensaje> : null}
      <Mensaje tono="info">Te llegará un mensaje de texto con 6 números. Solo lo verá el vecino que te ayude o al que tú ayudes.</Mensaje>
    </Pantalla>
  );
}
