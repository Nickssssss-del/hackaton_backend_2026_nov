/**
 * Vista. A3 · ¿Dónde vives? · Paso 1 de 4 (Mockup v4, p. 3).
 * «Usar mi ubicación»: GPS (solo mientras se usa la app) → A3.1 con calle y número precargados
 *   para confirmar («Sí, aquí vivo», INC-02).
 * «Decir mi dirección»: va a A3.1 para dictar o escribir.
 * A la nube solo se envían coordenadas redondeadas a 3 decimales (ver registroVecinos.ts).
 */
import { router } from "expo-router";
import { useState } from "react";
import { ubicarDomicilio } from "../../src/controladores/registroVecinos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Ilustracion } from "../../src/vistas/componentes/Ilustracion";
import { IndicadorPasos } from "../../src/vistas/componentes/IndicadorPasos";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";

const AVISOS = {
  denegado: "No tenemos permiso para ver tu ubicación. Puedes decir tu dirección.",
  sin_senal: "No encontramos tu ubicación. Puedes decir tu dirección.",
} as const;

export default function DondeVives() {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<keyof typeof AVISOS | null>(null);

  const usarUbicacion = async () => {
    setAviso(null);
    setBuscando(true);
    const resultado = await ubicarDomicilio();
    setBuscando(false);
    if (resultado.estado !== "ok") {
      setAviso(resultado.estado);
      return;
    }
    router.push({
      pathname: "/alta/direccion",
      params: { calle: resultado.calle, numero: resultado.numero, desdeGps: "1" },
    });
  };

  return (
    <Pantalla
      titulo="¿Dónde vives?"
      volver
      encabezado={<IndicadorPasos paso={1} />}
      textoEscuchar="Paso 1 de 4. ¿Dónde vives? Toca Usar mi ubicación, o Decir mi dirección."
      pie={
        <>
          <BotonPrincipal icono="map-marker-outline" cargando={buscando} onPress={() => void usarUbicacion()}>
            Usar mi ubicación
          </BotonPrincipal>
          <BotonPrincipal variante="secundario" icono="microphone" onPress={() => router.push("/alta/direccion")}>
            Decir mi dirección
          </BotonPrincipal>
        </>
      }
    >
      <Ilustracion tipo="mapa" alto={200} />
      {aviso ? <Mensaje tono="aviso">{AVISOS[aviso]}</Mensaje> : null}
    </Pantalla>
  );
}
