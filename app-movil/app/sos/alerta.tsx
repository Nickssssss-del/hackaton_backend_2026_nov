/**
 * Vista. G3 · Alerta vecinal real (Mockup v4, p. 25). Se abre al tocar el aviso push
 * «Un vecino necesita ayuda a X m» (Edge Function alerta-vecinos), con `emergencia`.
 * - Mapa de OpenStreetMap (MapaOSM): primero tu punto y un anillo a la distancia aproximada
 *   (ver_alerta no entrega la ubicación); tras «Voy a ayudar», tu punto, el de la persona y el camino.
 * - Primero solo la distancia y cuántos van (ver_alerta): sin nombre ni dirección.
 * - «Voy a ayudar»: si la base lo permite, muestra nombre y dirección, «Cómo llegar» y el contador.
 * - «Llamar 106» abre el marcador. «No puedo» sale; si ya iba, avisa «Ya no puedo ir».
 * La demo sin backend sigue en /sos/vecino.
 */
import { router, useLocalSearchParams } from "expo-router";
import { Linking, StyleSheet, View } from "react-native";
import { useAlertaVecinal } from "../../src/controladores/useAlertaVecinal";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Icono } from "../../src/vistas/componentes/Icono";
import { MapaOSM, type PuntoMapa } from "../../src/vistas/componentes/MapaOSM";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

function distanciaLegible(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
  return `${Math.max(10, Math.round(m / 10) * 10)} m`;
}

function textoVan(n: number): string {
  return n === 0 ? "Todavía nadie confirmó que va" : n === 1 ? "1 vecino confirmó que va" : `${n} vecinos confirmaron que van`;
}

export default function AlertaVecinal() {
  const { tema } = useTema();
  const c = tema.colores;
  const { emergencia } = useLocalSearchParams<{ emergencia?: string }>();
  const a = useAlertaVecinal(emergencia);
  const salir = () => (router.canGoBack() ? router.back() : router.replace("/principal"));

  if (a.fase === "terminada") {
    return (
      <Pantalla titulo="Alerta vecinal" volver={salir} textoEscuchar="Esta emergencia ya terminó. Gracias por estar atento.">
        <Mensaje tono="listo">Esta emergencia ya terminó. Gracias por estar atento.</Mensaje>
        <BotonPrincipal variante="secundario" icono="home-outline" onPress={() => router.replace("/principal")}>
          Volver al inicio
        </BotonPrincipal>
      </Pantalla>
    );
  }

  if (a.fase === "verificar") {
    return (
      <Pantalla titulo="Alerta vecinal" volver={salir} textoEscuchar="Para ver las alertas de tus vecinos, primero confirma tu celular.">
        <Mensaje tono="aviso">Para ver las alertas de tus vecinos, primero confirma tu celular.</Mensaje>
        <BotonPrincipal variante="tocar" icono="cellphone-check" onPress={() => router.push("/perfil/verificar")}>
          Confirmar mi celular
        </BotonPrincipal>
        <BotonPrincipal variante="emergencia" icono="phone" onPress={() => void Linking.openURL("tel:106")}>
          Llamar 106
        </BotonPrincipal>
      </Pantalla>
    );
  }

  const v = a.vista;
  const r = a.respuesta;
  const van = v?.vecinosEnCamino ?? r?.vecinosEnCamino ?? 0;
  const distancia = r?.distanciaM ?? v?.distanciaM;
  const titulo = a.fase === "voy" && r?.nombre ? `${r.nombre} necesita ayuda` : "Un vecino necesita ayuda";
  const textoEscuchar = [
    titulo,
    distancia !== undefined ? `a ${distanciaLegible(distancia)} de ti` : "",
    textoVan(van),
    a.fase === "voy" && r?.direccion ? `Dirección: ${r.direccion}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const urlIr =
    r?.lat !== undefined && r?.lng !== undefined
      ? `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}&travelmode=walking`
      : r?.direccion
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.direccion)}`
        : null;

  return (
    <Pantalla
      textoEscuchar={textoEscuchar}
      pie={
        <>
          {a.fase === "vista" ? (
            <BotonPrincipal variante="listo" icono="walk" cargando={a.ocupado} onPress={() => void a.voy()}>
              Voy a ayudar
            </BotonPrincipal>
          ) : null}
          {a.fase === "voy" && urlIr ? (
            <BotonPrincipal variante="tocar" icono="map-marker-path" onPress={() => void Linking.openURL(urlIr)}>
              Cómo llegar
            </BotonPrincipal>
          ) : null}
          <BotonPrincipal variante="emergencia" icono="phone" onPress={() => void Linking.openURL("tel:106")}>
            Llamar 106
          </BotonPrincipal>
          <BotonPrincipal
            variante="neutro"
            cargando={a.ocupado && a.fase === "voy"}
            onPress={() => {
              if (a.fase === "voy") void a.noPuedo().then(salir);
              else salir();
            }}
          >
            {a.fase === "voy" ? "Ya no puedo ir" : "No puedo"}
          </BotonPrincipal>
        </>
      }
    >
      <View style={[estilos.cabecera, { backgroundColor: c.peligro }]} accessibilityRole="header">
        <View style={estilos.circuloBlanco}>
          <Icono nombre="alert-outline" tamano={34} color={c.peligro} />
        </View>
        <View style={{ flex: 1 }}>
          <Texto variante="titulo" color="#FFFFFF">{titulo}</Texto>
          {distancia !== undefined ? <Texto color="#FFFFFF">{`A ${distanciaLegible(distancia)} de ti`}</Texto> : null}
        </View>
      </View>

      {a.yo ? (
        <MapaOSM
          puntos={[
            { ...a.yo, tipo: "yo" } as PuntoMapa,
            ...(a.fase === "voy" && r?.lat !== undefined && r?.lng !== undefined
              ? [{ lat: r.lat, lng: r.lng, tipo: "ayuda" } as PuntoMapa]
              : []),
          ]}
          anilloM={a.fase === "voy" && r?.lat !== undefined ? undefined : distancia}
          descripcion={
            a.fase === "voy" && r?.lat !== undefined
              ? `Mapa: tú y ${r.nombre ?? "la persona"}, a ${distancia !== undefined ? distanciaLegible(distancia) : "poca distancia"}.`
              : `Mapa: tú al centro. La persona está a ${distancia !== undefined ? distanciaLegible(distancia) : "poca distancia"}, en algún punto del círculo rojo.`
          }
        />
      ) : null}
      {a.yo && a.fase !== "voy" && distancia !== undefined ? (
        <Texto variante="ayuda" color={c.textoSecundario}>Está en algún punto del círculo rojo. Al tocar «Voy a ayudar» verás el lugar exacto.</Texto>
      ) : null}
      {a.fase === "voy" && r?.direccion ? (
        <View style={[estilos.chip, { backgroundColor: c.accionSuave }]}>
          <Texto variante="etiqueta" color={c.accionTexto}>{r.direccion}</Texto>
        </View>
      ) : null}

      {a.fase === "cargando" ? <Texto variante="ayuda">Buscando dónde es…</Texto> : null}
      {a.fase === "sin_ubicacion" ? (
        <Mensaje tono="aviso">No pude saber dónde estás. Activa la ubicación y vuelve a abrir el aviso.</Mensaje>
      ) : null}
      {a.error ? <Mensaje tono="aviso">{a.error}</Mensaje> : null}

      <View style={[estilos.franja, { backgroundColor: c.confirmadoSuave }]} accessible accessibilityLiveRegion="polite">
        <Icono nombre="account-group-outline" tamano={28} color={c.confirmado} />
        <Texto variante="etiqueta" color={c.confirmado} style={{ flex: 1 }}>{textoVan(van)}</Texto>
      </View>

      {a.fase === "voy" && r ? (
        <View style={[estilos.datos, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          {r.nombre ? <Texto variante="subtitulo">{r.nombre}</Texto> : null}
          {r.direccion ? <Texto>{r.direccion}</Texto> : <Texto variante="ayuda">No dejó dirección. Usa «Cómo llegar».</Texto>}
          <Mensaje tono="info">Gracias por ir. Si no puedes llegar, toca «Ya no puedo ir» para que otros lo sepan.</Mensaje>
        </View>
      ) : null}

      {a.fase === "no_cumple" ? (
        <Mensaje tono="aviso">
          Por seguridad, solo ven la dirección los vecinos que viven a 500 m o menos y están a 1 km o menos. Si puedes, llama al 106.
        </Mensaje>
      ) : null}

      {a.fase === "vista" ? (
        <Texto variante="ayuda" color={c.textoSecundario}>
          Al tocar «Voy a ayudar» verás su nombre y su dirección. Queda registrado quién la vio.
        </Texto>
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: RADIO.l, padding: 16 },
  circuloBlanco: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  franja: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: RADIO.l, padding: 14, minHeight: 64 },
  datos: { borderWidth: 1.5, borderRadius: RADIO.l, padding: 14, gap: 8 },
  chip: { alignSelf: "flex-start", borderRadius: RADIO.m, paddingHorizontal: 12, paddingVertical: 6 },
});
