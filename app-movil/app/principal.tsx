/**
 * Vista. B1 · Inicio del adulto mayor (modo sencillo) y B2 · Inicio del vecino (modo completo).
 * Mockup v4, pp. 8–9. Un solo componente; el conjunto de tarjetas cambia según el modo.
 *
 * Destinos mientras se construyen los módulos C–G:
 * - Pastillas → C1 (/pastillas). Pregúntale a Vecinos → D1 (/preguntale). Comunidad → F2 (/comunidad).
 * - Necesito/Quiero ayudar y Ayuda vecinal → F1 (/ayuda-vecinos).
 * - Emergencia → G1 (/sos). La emergencia anterior (/emergencia) sigue disponible.
 * - Servicios → E1 (/servicios), Crear servicio → E4 (/servicios/publicar), Mi negocio → /servicios/mios.
 */
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferencias } from "../src/controladores/PreferenciasContexto";
import { leerPerfil } from "../src/controladores/registroVecinos";
import { ajustarVozPorSituaciones } from "../src/controladores/useEscuchar";
import { leerSituaciones, type Situacion } from "../src/modelos/local/situaciones";
import { SITUACIONES } from "../src/vistas/componentes/estiloSituaciones";
import { cantidadLegible, estadosDelDia, horaLegible, leerPastillas, leerTomadasHoy, type Pastilla } from "../src/modelos/local/pastillas";
import { useEscuchar } from "../src/controladores/useEscuchar";
import { elegirAvatar, type TipoAvatar } from "../src/modelos/avatar";
import type { Genero } from "../src/modelos/tipos";
import { Avatar } from "../src/vistas/componentes/Avatar";
import { BotonPrincipal } from "../src/vistas/componentes/BotonPrincipal";
import { Icono, type NombreIcono } from "../src/vistas/componentes/Icono";
import { Pantalla } from "../src/vistas/componentes/Pantalla";
import { TarjetaAcceso } from "../src/vistas/componentes/TarjetaAcceso";
import { Texto } from "../src/vistas/componentes/Texto";
import { ALTO_TACTIL, colorIcono, RADIO, TAMANOS_LETRA } from "../src/vistas/tema/tokens";
import { useTema } from "../src/vistas/tema/useTema";

const ir = (ruta: Href) => () => router.push(ruta);

export default function Principal() {
  const { tema } = useTema();
  const c = tema.colores;
  const { modo, tamano, siguienteTamano, oscuro, setOscuro } = usePreferencias();
  const voz = useEscuchar();
  const [nombre, setNombre] = useState("");
  const [datosAvatar, setDatosAvatar] = useState<{ edad?: number; genero?: Genero; avatar?: TipoAvatar }>({});
  const avatar = elegirAvatar({ ...datosAvatar, modo });
  const [proxima, setProxima] = useState<Pastilla | null>(null);
  const [situaciones, setSituaciones] = useState<Situacion[]>([]);
  const esVecino = modo === "completo";

  useFocusEffect(
    useCallback(() => {
      void leerPerfil().then((perfil) => {
        setNombre(perfil.nombre?.trim().split(/\s+/)[0] ?? "");
        setDatosAvatar({ edad: perfil.edad, genero: perfil.genero, avatar: perfil.avatar });
      });
      void leerSituaciones().then((lista) => {
        setSituaciones(lista);
        ajustarVozPorSituaciones(lista);
      });
      void Promise.all([leerPastillas(), leerTomadasHoy()]).then(([lista, hoy]) => {
        const estados = estadosDelDia(lista, hoy);
        const ordenadas = [...lista].sort((a, b) => a.hora.localeCompare(b.hora));
        setProxima(ordenadas.find((p) => estados[p.id] === "actual") ?? ordenadas.find((p) => estados[p.id] === "pendiente") ?? ordenadas[0] ?? null);
      });
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
        <BotonPrincipal variante="emergencia" icono="alert-outline" onPress={ir("/sos")}>
          Emergencia
        </BotonPrincipal>
      }
    >
      {/* Cabecera: avatar, saludo y Mis datos › */}
      <View style={estilos.cabecera}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Avatar tipo={avatar} />
        </View>
        <View style={estilos.saludo}>
          <Texto variante="titulo" accessibilityRole="header">{saludo}</Texto>
          {/* Debajo del nombre, en una línea: lo que le pasa a la persona (B4). */}
          <LineaQueMePasa situaciones={situaciones} />
          <Pressable accessibilityRole="button" accessibilityLabel="Mis datos" onPress={ir("/perfil")} style={estilos.enlace} hitSlop={8}>
            <Texto variante="etiqueta" color={c.accionTexto}>Mis datos</Texto>
            <Icono nombre="chevron-right" color={c.accionTexto} tamano={22} />
          </Pressable>
        </View>
      </View>

      {/* Lo que me pasa (B4). Modo sencillo: lo PRIMERO del Inicio (pedido del equipo).
          Modo completo: va entre las tarjetas principales, más abajo. */}
      {esVecino ? null : <LoQueMePasa situaciones={situaciones} />}

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
        <TarjetaAcceso tono="listo" icono="plus" titulo="Crear servicio" onPress={ir("/servicios/publicar")} />
      ) : (
        <TarjetaAcceso
          tono="aviso"
          icono="pill"
          colorIcono="naranja"
          titulo="Horario de pastillas"
          subtitulo={proxima ? `Próxima: ${horaLegible(proxima.hora)} · ${proxima.nombre} · ${cantidadLegible(proxima.cantidad)}` : "Aún no tienes pastillas"}
          onPress={ir("/pastillas")}
        />
      )}

      <TarjetaAcceso
        icono="robot-happy-outline"
        colorIcono="turquesa"
        titulo="Pregúntale a Vecinos"
        subtitulo="Habla o escribe"
        accion="microfono"
        onPress={ir("/preguntale")}
      />

      {esVecino ? <LoQueMePasa situaciones={situaciones} /> : null}

      <View style={estilos.fila}>
        <TarjetaAcceso vertical tono="tocar" icono="heart-outline" titulo="Necesito ayuda" onPress={ir("/ayuda-vecinos")} />
        <TarjetaAcceso vertical tono="listo" icono="account-group-outline" titulo="Quiero ayudar" onPress={ir({ pathname: "/ayuda-vecinos", params: { pestana: "ayudar" } })} />
      </View>

      <View style={estilos.fila}>
        <TarjetaAcceso vertical icono="storefront-outline" colorIcono="naranja" titulo="Servicios" onPress={ir("/servicios")} />
        <TarjetaAcceso
          vertical
          icono="account-multiple-outline"
          colorIcono="morado"
          titulo="Comunidad"
          onPress={ir("/comunidad")}
        />
      </View>

      {esVecino ? (
        <View style={estilos.fila}>
          <TarjetaAcceso vertical icono="message-outline" colorIcono="turquesa" titulo="Mi negocio" onPress={ir("/servicios/mios")} />
          <TarjetaAcceso vertical icono="pulse" colorIcono="rojo" titulo="Ayuda vecinal" onPress={ir("/ayuda-vecinos")} />
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
      style={[estilos.rapido, { backgroundColor: c.superficie, borderColor: tema.oscuro ? c.borde : c.accion }]}
    >
      <Icono nombre={icono} color={color} tamano={22} />
      <Texto variante="etiqueta" color={color} centrado>{texto}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: "row", alignItems: "center", gap: 10 },
  saludo: { flex: 1 },
  enlace: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", minHeight: 36 },
  rapidos: { flexDirection: "row", gap: 8 },
  rapido: {
    flex: 1,
    minHeight: ALTO_TACTIL + 12,
    borderRadius: RADIO.m,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 2,
  },
  fila: { flexDirection: "row", gap: 10 },
});

/** «Vivo solo · Oigo poco» bajo el saludo, con sus íconos. Toca para cambiar. Nada si no eligió. */
function LineaQueMePasa({ situaciones }: { situaciones: Situacion[] }) {
  const { tema } = useTema();
  const elegidas = SITUACIONES.filter((s) => s.valor !== "ninguna" && situaciones.includes(s.valor));
  if (elegidas.length === 0) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lo que te pasa: ${elegidas.map((s) => s.etiqueta).join(", ")}. Toca para cambiar.`}
      onPress={() => router.push("/perfil/situaciones")}
      hitSlop={6}
      style={estilosPasa.linea}
    >
      {elegidas.map((s, k) => (
        <View key={s.valor} style={estilosPasa.itemLinea}>
          <Icono nombre={s.icono} tamano={20} color={colorIcono(s.color, tema.oscuro).icono} />
          <Texto variante="etiqueta" color={tema.colores.textoSecundario}>
            {s.etiqueta}
            {k < elegidas.length - 1 ? " ·" : ""}
          </Texto>
        </View>
      ))}
    </Pressable>
  );
}

/** Si aún no eligió nada: la tarjeta «¿Algo de esto te pasa?». Si ya eligió, se ve bajo el nombre. */
function LoQueMePasa({ situaciones }: { situaciones: Situacion[] }) {
  const elegidas = SITUACIONES.filter((s) => s.valor !== "ninguna" && situaciones.includes(s.valor));
  if (situaciones.includes("ninguna")) return null;
  if (elegidas.length === 0) {
    return (
      <TarjetaAcceso
        icono="hand-heart-outline"
        colorIcono="morado"
        titulo="¿Algo de esto te pasa?"
        subtitulo="Vivo solo, oigo poco, veo poco…"
        onPress={() => router.push("/perfil/situaciones")}
      />
    );
  }
  return null;
}

const estilosPasa = StyleSheet.create({
  linea: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 2 },
  itemLinea: { flexDirection: "row", alignItems: "center", gap: 4 },
});
