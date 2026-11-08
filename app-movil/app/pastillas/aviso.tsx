/**
 * Vista. C3 · Es hora de tu pastilla (Mockup v4, p. 14). Fondo amarillo de aviso, sin «Volver».
 * Se abre al tocar la notificación, o desde «Demo: así te aviso» (demo=1, no registra nada).
 * Mientras está abierta suena (timbre cada 5 s) y vibra, según lo elegido en C2; si tiene aviso
 * por voz, además lo lee en voz alta. Todo se detiene al tocar un botón o salir.
 */
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { detenerAlarma, sonarAlarma } from "../../src/controladores/alarmaPastilla";
import { posponerDiezMinutos } from "../../src/controladores/recordatorios";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { cantidadLegible, horaLegible, leerPastillas, marcarTomada, type Pastilla } from "../../src/modelos/local/pastillas";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Ilustracion } from "../../src/vistas/componentes/Ilustracion";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { colorIcono, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

export default function EsHoraDeTuPastilla() {
  const { tema } = useTema();
  const c = tema.colores;
  const { id, demo } = useLocalSearchParams<{ id?: string; demo?: string }>();
  const voz = useEscuchar();
  const [pastilla, setPastilla] = useState<Pastilla | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const esDemo = demo === "1";

  useEffect(() => {
    void leerPastillas().then((lista) => {
      const p = lista.find((x) => x.id === id) ?? lista[0] ?? null;
      setPastilla(p);
      if (!p) return;
      void sonarAlarma(p.aviso);
      if (p.aviso.voz) {
        setTimeout(() => void voz.escuchar(`Es hora de tu pastilla. ${p.nombre}. Toma ${cantidadLegible(p.cantidad)}.`, true), 1300);
      }
    });
    return () => detenerAlarma();
    // Solo al abrir la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const salir = () => {
    detenerAlarma();
    void voz.silenciar();
    if (router.canGoBack()) router.back();
    else router.replace("/pastillas");
  };

  const yaLaTome = async () => {
    if (pastilla && !esDemo) await marcarTomada(pastilla.id, true);
    salir();
  };

  const posponer = async () => {
    if (!pastilla || esDemo) {
      salir();
      return;
    }
    const ok = await posponerDiezMinutos(pastilla);
    if (ok) salir();
    else setMensaje("No se pudo programar el aviso. Revisa el permiso de notificaciones.");
  };

  const textoEscuchar = pastilla
    ? `Es hora de tu pastilla. ${horaLegible(pastilla.hora)}. ${pastilla.nombre}. Toma ${cantidadLegible(pastilla.cantidad)}.`
    : "Es hora de tu pastilla.";

  return (
    <Pantalla
      fondo="aviso"
      textoEscuchar={textoEscuchar}
      pie={
        <>
          <BotonPrincipal variante="listo" icono="check" onPress={() => void yaLaTome()}>Ya la tomé</BotonPrincipal>
          <BotonPrincipal variante="secundario" icono="bell-outline" onPress={() => void posponer()}>
            Recuérdame en 10 min
          </BotonPrincipal>
        </>
      }
    >
      {esDemo ? <Mensaje tono="info">Demo: así te avisaré a la hora de cada pastilla.</Mensaje> : null}
      <View style={estilos.reloj}>
        <View style={estilos.imagen}>
          <Ilustracion tipo="despertador" redondeo={false} />
        </View>
      </View>
      <Texto variante="titulo" centrado accessibilityRole="header" color={c.avisoTexto}>Es hora de tu pastilla</Texto>
      {pastilla ? (
        <View style={[estilos.tarjeta, { backgroundColor: c.superficie }]}>
          <Texto variante="grande" centrado>{horaLegible(pastilla.hora)}</Texto>
          <Texto variante="subtitulo" centrado>{pastilla.nombre}</Texto>
          <Texto variante="subtitulo" centrado color={colorIcono("naranja", tema.oscuro).icono}>
            Toma {cantidadLegible(pastilla.cantidad)}
          </Texto>
        </View>
      ) : null}
      {mensaje ? <Mensaje tono="aviso">{mensaje}</Mensaje> : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  reloj: { alignItems: "center" },
  imagen: { width: "70%", maxWidth: 260 },
  tarjeta: { borderRadius: RADIO.l, padding: 18, gap: 4 },
});
