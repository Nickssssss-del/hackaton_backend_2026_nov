/**
 * Vista. B1 · Inicio del adulto mayor (modo sencillo) y B2 · Inicio del vecino (modo completo).
 * Mockup v4, pp. 8–9. Un solo componente; el conjunto de tarjetas cambia según el modo.
 *
 * Destinos mientras se construyen los módulos C–G:
 * - Pastillas, Pregúntale a Vecinos y Comunidad → pantalla «Llega pronto».
 * - Necesito/Quiero ayudar, Servicios, Crear servicio, Mi negocio, Ayuda vecinal y Emergencia →
 *   pantallas anteriores, que ya funcionan con Supabase (la emergencia anterior se mantiene
 *   hasta probar la nueva en un teléfono).
 */
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferencias } from "../src/controladores/PreferenciasContexto";
import { leerPerfil } from "../src/controladores/registroVecinos";
import { useEscuchar } from "../src/controladores/useEscuchar";
import { BotonPrincipal } from "../src/vistas/componentes/BotonPrincipal";
import { Icono, type NombreIcono } from "../src/vistas/componentes/Icono";
import { Pantalla } from "../src/vistas/componentes/Pantalla";
import { TarjetaAcceso } from "../src/vistas/componentes/TarjetaAcceso";
import { Texto } from "../src/vistas/componentes/Texto";
import { ALTO_TACTIL, RADIO, TAMANOS_LETRA } from "../src/vistas/tema/tokens";
import { useTema } from "../src/vistas/tema/useTema";

const ir = (ruta: Href) => () => router.push(ruta);

export default function Principal() {
  const { tema } = useTema();
  const c = tema.colores;
  const { modo, tamano, siguienteTamano, oscuro, setOscuro } = usePreferencias();
  const voz = useEscuchar();
  const [nombre, setNombre] = useState("");
  const esVecino = modo === "completo";

  useFocusEffect(
    useCallback(() => {
      void leerPerfil().then((perfil) => setNombre(perfil.nombre?.trim().split(/\s+/)[0] ?? ""));
    }, []),
  );

  const saludo = nombre ? `Hola, ${nombre}` : "Hola";
  const textoEscuchar = esVecino
    ? `${saludo}. Puedes crear un servicio, preguntarle a Vecinos, pedir o dar ayuda, ver servicios, la comunidad, tu negocio, la ayuda vecinal y tus datos. Abajo está el botón rojo de emergencia.`
    : `${saludo}. Puedes ver tu horario de pastillas, preguntarle a Vecinos, pedir o dar ayuda, ver servicios, la comunidad y tus datos. Abajo está el botón rojo de emergencia.`;

  return (
    <Pantalla
      sinBarra
      textoEscuchar={textoEscuchar}
      pie={
        <BotonPrincipal variante="emergencia" icono="alert-outline" onPress={ir("/emergencia")}>
          Emergencia
        </BotonPrincipal>
      }
    >
      {/* Cabecera: avatar, saludo y Mis datos › */}
      <View style={estilos.cabecera}>
        <View style={[estilos.avatar, { backgroundColor: c.accionSuave }]}>
          <Icono nombre="account" color={c.accionTexto} tamano={30} />
        </View>
        <Texto variante="titulo" accessibilityRole="header" style={estilos.saludo}>{saludo}</Texto>
        <Pressable accessibilityRole="button" accessibilityLabel="Mis datos" onPress={ir("/perfil")} style={estilos.enlace}>
          <Texto variante="etiqueta" color={tema.oscuro ? c.texto : c.accion}>Mis datos</Texto>
          <Icono nombre="chevron-right" color={tema.oscuro ? c.texto : c.accion} tamano={22} />
        </Pressable>
      </View>

      {/* Accesos rápidos: A+ (tamaño actual), Oscuro, Escuchar */}
      <View style={estilos.rapidos}>
        <BotonRapido
          icono="format-size"
          texto={`A+ ${TAMANOS_LETRA[tamano].etiqueta}`}
          etiqueta={`Tamaño de letra: ${TAMANOS_LETRA[tamano].etiqueta}. Toca para cambiar.`}
          onPress={siguienteTamano}
        />
        <BotonRapido
          icono={oscuro ? "white-balance-sunny" : "moon-waning-crescent"}
          texto={oscuro ? "Claro" : "Oscuro"}
          etiqueta={oscuro ? "Modo oscuro: Sí. Toca para quitarlo." : "Modo oscuro: No. Toca para activarlo."}
          onPress={() => setOscuro(!oscuro)}
        />
        <BotonRapido
          icono="volume-high"
          texto="Escuchar"
          etiqueta="Escuchar esta pantalla"
          onPress={() => void voz.escuchar(textoEscuchar, true)}
        />
      </View>

      {esVecino ? (
        <TarjetaAcceso tono="listo" icono="plus" titulo="Crear servicio" onPress={ir("/publicar")} />
      ) : (
        <TarjetaAcceso
          tono="aviso"
          icono="pill"
          titulo="Horario de pastillas"
          subtitulo="Aún no tienes pastillas"
          onPress={ir({ pathname: "/pronto", params: { modulo: "pastillas" } })}
        />
      )}

      <TarjetaAcceso
        icono="robot-happy-outline"
        titulo="Pregúntale a Vecinos"
        subtitulo="Habla o escribe"
        accion="microfono"
        onPress={ir({ pathname: "/pronto", params: { modulo: "asistente" } })}
      />

      <View style={estilos.fila}>
        <TarjetaAcceso vertical tono="tocar" icono="heart-outline" titulo="Necesito ayuda" onPress={ir("/ayuda/pedir")} />
        <TarjetaAcceso vertical tono="listo" icono="account-group-outline" titulo="Quiero ayudar" onPress={ir("/ayuda")} />
      </View>

      <View style={estilos.fila}>
        <TarjetaAcceso vertical icono="storefront-outline" titulo="Servicios" onPress={ir("/buscar")} />
        <TarjetaAcceso
          vertical
          icono="account-multiple-outline"
          titulo="Comunidad"
          onPress={ir({ pathname: "/pronto", params: { modulo: "comunidad" } })}
        />
      </View>

      {esVecino ? (
        <View style={estilos.fila}>
          <TarjetaAcceso vertical icono="message-outline" titulo="Mi negocio" onPress={ir("/mis-servicios")} />
          <TarjetaAcceso vertical icono="pulse" titulo="Ayuda vecinal" onPress={ir("/ayuda")} />
        </View>
      ) : null}

      <TarjetaAcceso icono="account-cog-outline" titulo="Mis datos" subtitulo="Letra y contactos" onPress={ir("/perfil")} />
    </Pantalla>
  );
}

function BotonRapido({ icono, texto, etiqueta, onPress }: {
  icono: NombreIcono;
  texto: string;
  etiqueta: string;
  onPress: () => void;
}) {
  const { tema } = useTema();
  const c = tema.colores;
  const color = tema.oscuro ? c.texto : c.accion;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={[estilos.rapido, { backgroundColor: c.superficie, borderColor: c.borde }]}
    >
      <Icono nombre={icono} color={color} tamano={22} />
      <Texto variante="etiqueta" color={color} centrado>{texto}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  saludo: { flex: 1 },
  enlace: { flexDirection: "row", alignItems: "center", minHeight: ALTO_TACTIL, paddingHorizontal: 4 },
  rapidos: { flexDirection: "row", gap: 8 },
  rapido: {
    flex: 1,
    minHeight: ALTO_TACTIL + 12,
    borderRadius: RADIO.m,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 2,
  },
  fila: { flexDirection: "row", gap: 10 },
});
