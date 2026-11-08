/**
 * Vista. B3 · Mis datos (Mockup v4, p. 10).
 * Tamaño de letra (Normal, Grande, Enorme), interruptores Sí/No, filas Mi dirección, Mis contactos,
 * ¿Algo te pasa? y «Cambiar de modo». Todo se guarda al instante en el teléfono.
 * Mi dirección, Mis contactos y Cambiar de modo reutilizan A3.1, A5 y A2 en modo edición (INC-29).
 * «Más opciones» lleva a la pantalla anterior (perfil, ficha y borrar mis datos), que se conserva.
 */
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferencias } from "../../src/controladores/PreferenciasContexto";
import type { TamanoLetra } from "../../src/modelos/local/preferencias";
import { InterruptorSiNo } from "../../src/vistas/componentes/InterruptorSiNo";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { TarjetaAcceso } from "../../src/vistas/componentes/TarjetaAcceso";
import { Texto } from "../../src/vistas/componentes/Texto";
import { RADIO, TAMANOS_LETRA } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

const ORDEN: TamanoLetra[] = ["normal", "grande", "enorme"];

export default function MisDatos() {
  const { tema } = useTema();
  const c = tema.colores;
  const prefs = usePreferencias();

  return (
    <Pantalla
      titulo="Mis datos"
      volver
      textoEscuchar={`Mis datos. Tamaño de letra: ${TAMANOS_LETRA[prefs.tamano].etiqueta}. Modo oscuro: ${prefs.oscuro ? "sí" : "no"}. Avisar si salgo de casa: ${prefs.avisarAlSalir ? "sí" : "no"}. Vecinos cerca me ven si pido ayuda: ${prefs.visibleParaVecinos ? "sí" : "no"}. También puedes cambiar tu dirección, tus contactos, lo que te pasa y el modo.`}
    >
      <Texto variante="etiqueta">Tamaño de letra</Texto>
      <View style={estilos.tamanos} accessibilityRole="radiogroup" accessibilityLabel="Tamaño de letra">
        {ORDEN.map((t) => {
          const activo = prefs.tamano === t;
          const { etiqueta, base } = TAMANOS_LETRA[t];
          return (
            <Pressable
              key={t}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={etiqueta}
              onPress={() => prefs.setTamano(t)}
              style={[
                estilos.tamano,
                {
                  backgroundColor: activo ? c.accion : c.superficie,
                  borderColor: activo ? c.accion : c.borde,
                },
              ]}
            >
              <Texto
                negrita
                color={activo ? c.sobreColor : c.texto}
                maxFontSizeMultiplier={1}
                style={{ fontSize: base + 8, lineHeight: base + 14 }}
              >
                A
              </Texto>
              <Texto variante="etiqueta" color={activo ? c.sobreColor : c.texto} centrado>{etiqueta}</Texto>
            </Pressable>
          );
        })}
      </View>

      <InterruptorSiNo etiqueta="Modo oscuro" valor={prefs.oscuro} onCambiar={prefs.setOscuro} />
      <InterruptorSiNo etiqueta="Avisar si salgo de casa" valor={prefs.avisarAlSalir} onCambiar={prefs.setAvisarAlSalir} />
      <InterruptorSiNo
        etiqueta="Vecinos cerca me ven si pido ayuda"
        valor={prefs.visibleParaVecinos}
        onCambiar={prefs.setVisibleParaVecinos}
      />

      <TarjetaAcceso
        icono="home-outline"
        titulo="Mi dirección"
        onPress={() => router.push({ pathname: "/alta/direccion", params: { editar: "1" } })}
      />
      <TarjetaAcceso
        icono="account-heart-outline"
        titulo="Mis contactos"
        onPress={() => router.push({ pathname: "/alta/contactos", params: { editar: "1" } })}
      />
      <TarjetaAcceso icono="hand-heart-outline" titulo="¿Algo te pasa?" onPress={() => router.push("/perfil/situaciones")} />
      <TarjetaAcceso
        icono="swap-horizontal"
        titulo="Cambiar de modo"
        subtitulo={prefs.modo === "completo" ? "Ahora: Modo completo" : "Ahora: Modo sencillo"}
        onPress={() => router.push({ pathname: "/alta/modo", params: { editar: "1" } })}
      />
      <TarjetaAcceso
        icono="dots-horizontal"
        titulo="Más opciones"
        subtitulo="Perfil, ficha y borrar mis datos"
        onPress={() => router.push("/mis-datos")}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  tamanos: { flexDirection: "row", gap: 8 },
  tamano: {
    flex: 1,
    minHeight: 96,
    borderRadius: RADIO.m,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
