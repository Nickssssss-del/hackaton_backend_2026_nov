/**
 * Vista. B3 · Mis datos (Mockup v4, p. 10).
 * Tamaño de letra (Normal, Grande, Enorme), interruptores Sí/No, filas Mi dirección, Mis contactos,
 * ¿Algo te pasa? y «Cambiar de modo». Todo se guarda al instante en el teléfono.
 * Mi dirección, Mis contactos y Cambiar de modo reutilizan A3.1, A5 y A2 en modo edición (INC-29).
 * «Más opciones» lleva a la pantalla anterior (perfil, ficha y borrar mis datos), que se conserva.
 * Además: Mis datos personales (nombre, edad, género → A4 en edición), Mi avatar y
 * «Cerrar sesión en este teléfono» (con confirmación; borra solo lo guardado en el teléfono).
 */
import { router } from "expo-router";
import { useState } from "react";
import { cerrarSesionLocal } from "../../src/controladores/registroVecinos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
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
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    await cerrarSesionLocal();
    setSaliendo(false);
    router.dismissAll();
    router.replace("/alta");
  };

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
        icono="card-account-details-outline"
        titulo="Mis datos personales"
        subtitulo="Nombre, edad y si eres mujer u hombre"
        onPress={() => router.push({ pathname: "/alta/datos", params: { editar: "1" } })}
      />
      <TarjetaAcceso
        icono="account-circle-outline"
        colorIcono="morado"
        titulo="Mi avatar"
        subtitulo="Elige tu dibujo del Inicio"
        onPress={() => router.push("/perfil/avatar")}
      />
      <TarjetaAcceso
        icono="home-outline"
        titulo="Mi dirección"
        subtitulo="Calle, número y ubicación"
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
      <TarjetaAcceso
        icono="play-circle-outline"
        colorIcono="rojo"
        titulo="Probar la emergencia"
        subtitulo="Demo: no llama a nadie"
        onPress={() => router.push({ pathname: "/sos", params: { demo: "1" } })}
      />

      {confirmarSalida ? (
        <View style={[estilos.confirmar, { borderColor: c.peligro, backgroundColor: c.superficie }]}>
          <Texto variante="subtitulo">¿Cerrar sesión en este teléfono?</Texto>
          <Texto>
            Se borran de este teléfono tus datos, contactos, pastillas y dirección. Lo que publicaste en la nube se queda.
          </Texto>
          <BotonPrincipal variante="emergencia" icono="logout" cargando={saliendo} onPress={() => void salir()}>
            Sí, cerrar sesión
          </BotonPrincipal>
          <BotonPrincipal variante="neutro" onPress={() => setConfirmarSalida(false)}>
            No, quedarme
          </BotonPrincipal>
        </View>
      ) : (
        <BotonPrincipal variante="neutro" icono="logout" onPress={() => setConfirmarSalida(true)}>
          Cerrar sesión
        </BotonPrincipal>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  tamanos: { flexDirection: "row", gap: 8 },
  confirmar: { borderWidth: 2, borderRadius: RADIO.l, padding: 14, gap: 10 },
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
