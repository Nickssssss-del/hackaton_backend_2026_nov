/**
 * Vista de desarrollo. Catálogo de componentes del Mockup v4 para probar en el teléfono
 * los 3 tamaños de letra y el modo oscuro. Solo existe en modo desarrollo.
 * Abrir con: npx uri-scheme open proyectobarrio://dev/catalogo --android  (o desde la terminal de Expo)
 */
import { Redirect } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { usePreferencias } from "../../src/controladores/PreferenciasContexto";
import { TAMANOS_LETRA } from "../../src/vistas/tema/tokens";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { Contador } from "../../src/vistas/componentes/Contador";
import { IndicadorPasos } from "../../src/vistas/componentes/IndicadorPasos";
import { InterruptorSiNo } from "../../src/vistas/componentes/InterruptorSiNo";
import { Opciones } from "../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { TarjetaAcceso } from "../../src/vistas/componentes/TarjetaAcceso";
import { Texto } from "../../src/vistas/componentes/Texto";

export default function Catalogo() {
  const prefs = usePreferencias();
  const [nombre, setNombre] = useState("Rosa Quispe");
  const [edad, setEdad] = useState(74);
  const [genero, setGenero] = useState<("mujer" | "hombre" | "no_decir")[]>(["mujer"]);
  const [aviso, setAviso] = useState(true);
  const [situaciones, setSituaciones] = useState<("solo" | "oigo")[]>(["solo"]);

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Pantalla
      titulo="Catálogo de componentes"
      volver
      encabezado={<IndicadorPasos paso={2} />}
      pie={
        <>
          <BotonPrincipal variante="listo" icono="check" onPress={() => undefined}>Guardar</BotonPrincipal>
          <BotonPrincipal onPress={() => undefined} motivoDesactivado="Falta 1 dato">Seguir</BotonPrincipal>
        </>
      }
    >
      <Texto variante="ayuda">
        Letra: {TAMANOS_LETRA[prefs.tamano].etiqueta} ({TAMANOS_LETRA[prefs.tamano].base} px) · Oscuro: {prefs.oscuro ? "Sí" : "No"} · Modo: {prefs.modo ?? "sin elegir"}
      </Texto>
      <CampoConVoz etiqueta="Tu nombre" valor={nombre} onCambiar={setNombre} completo={nombre.trim().length >= 2} />
      <Texto variante="etiqueta">Edad</Texto>
      <Contador
        nombre="Edad"
        valor={`${edad} años`}
        onMenos={() => setEdad((e) => e - 1)}
        onMas={() => setEdad((e) => e + 1)}
        puedeMenos={edad > 18}
        puedeMas={edad < 110}
      />
      <Texto variante="etiqueta">Eres</Texto>
      <Opciones
        nombre="Eres"
        opciones={[
          { valor: "mujer", etiqueta: "Mujer" },
          { valor: "hombre", etiqueta: "Hombre" },
        ]}
        seleccion={genero}
        onCambiar={setGenero}
      />
      <InterruptorSiNo etiqueta="Avisarles cuando salgo de casa" valor={aviso} onCambiar={setAviso} />
      <TarjetaAcceso tono="aviso" icono="pill" titulo="Horario de pastillas" subtitulo="2:00 p. m. · De la presión · 2" onPress={() => undefined} />
      <TarjetaAcceso icono="robot-happy-outline" titulo="Pregúntale a Vecinos" subtitulo="Habla o escribe" accion="microfono" onPress={() => undefined} />
      <View style={estilos.rejilla}>
        <TarjetaAcceso vertical tono="tocar" icono="heart-outline" titulo="Necesito ayuda" onPress={() => undefined} />
        <TarjetaAcceso vertical tono="listo" icono="account-group-outline" titulo="Quiero ayudar" onPress={() => undefined} />
      </View>
      <Opciones
        multiple
        columnas={2}
        nombre="¿Algo de esto te pasa?"
        opciones={[
          { valor: "solo", etiqueta: "Vivo solo", icono: "account-outline" },
          { valor: "oigo", etiqueta: "Oigo poco", icono: "ear-hearing" },
        ]}
        seleccion={situaciones}
        onCambiar={setSituaciones}
      />
      <BotonPrincipal variante="secundario" icono="map-marker-outline" onPress={() => undefined}>Ver en el mapa</BotonPrincipal>
      <BotonPrincipal variante="emergencia" icono="alert-outline" onPress={() => undefined}>Emergencia</BotonPrincipal>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  rejilla: { flexDirection: "row", gap: 10 },
});
