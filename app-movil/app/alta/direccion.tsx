/**
 * Vista. A3.1 · Tu dirección · Paso 1 de 3 (Mockup v4, p. 4).
 * Calle o avenida, Número y Referencia, cada uno con micrófono.
 * «Seguir» queda desactivado mostrando cuántos datos faltan («Falta 1 dato»).
 * «Omitir» continúa a A4 sin dirección. Todo se guarda solo en el teléfono.
 */
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  datosFaltantesDireccion,
  guardarDireccion,
  leerPerfil,
  omitirDireccion,
} from "../../src/controladores/registroVecinos";
import type { DireccionLocal } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { IndicadorPasos } from "../../src/vistas/componentes/IndicadorPasos";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";

const VACIA: DireccionLocal = { calle: "", numero: "", referencia: "" };

export default function TuDireccion() {
  const params = useLocalSearchParams<{ calle?: string; numero?: string; desdeGps?: string }>();
  const [direccion, setDireccion] = useState<DireccionLocal>(VACIA);

  useEffect(() => {
    let activo = true;
    void leerPerfil().then((perfil) => {
      if (!activo) return;
      const guardada = perfil.direccion ?? VACIA;
      setDireccion({
        calle: params.calle || guardada.calle,
        numero: params.numero || guardada.numero,
        referencia: guardada.referencia,
      });
    });
    return () => {
      activo = false;
    };
  }, [params.calle, params.numero]);

  const faltan = datosFaltantesDireccion(direccion);
  const cambiar = (campo: keyof DireccionLocal) => (texto: string) =>
    setDireccion((anterior) => ({ ...anterior, [campo]: texto }));

  const seguir = async () => {
    await guardarDireccion(direccion);
    router.push("/alta/datos");
  };
  const omitir = async () => {
    await omitirDireccion();
    router.push("/alta/datos");
  };

  return (
    <Pantalla
      titulo="Tu dirección"
      volver
      encabezado={<IndicadorPasos paso={1} />}
      textoEscuchar="Paso 1 de 3. Tu dirección. Di o escribe la calle o avenida, el número y una referencia."
      pie={
        <View style={estilos.fila}>
          <BotonPrincipal variante="neutro" estilo={estilos.omitir} onPress={() => void omitir()}>
            Omitir
          </BotonPrincipal>
          <BotonPrincipal
            estilo={estilos.seguir}
            motivoDesactivado={faltan > 0 ? `Falta ${faltan} ${faltan === 1 ? "dato" : "datos"}` : null}
            onPress={() => void seguir()}
          >
            Seguir
          </BotonPrincipal>
        </View>
      }
    >
      {params.desdeGps ? <Mensaje tono="info">¿Vives aquí? Revisa y corrige si hace falta.</Mensaje> : null}
      <CampoConVoz
        etiqueta="Calle o avenida"
        ayuda="Av. Los Maestros"
        valor={direccion.calle}
        onCambiar={cambiar("calle")}
        maxLength={80}
        completo={direccion.calle.trim().length > 0}
      />
      <CampoConVoz
        etiqueta="Número"
        ayuda="245"
        valor={direccion.numero}
        onCambiar={cambiar("numero")}
        maxLength={10}
        completo={direccion.numero.trim().length > 0}
      />
      <CampoConVoz
        etiqueta="Referencia"
        ayuda="Frente a la iglesia"
        valor={direccion.referencia}
        onCambiar={cambiar("referencia")}
        maxLength={80}
        completo={direccion.referencia.trim().length > 0}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", gap: 10 },
  omitir: { flex: 1 },
  seguir: { flex: 2 },
});
