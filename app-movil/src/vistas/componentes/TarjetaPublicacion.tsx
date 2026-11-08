/**
 * Vista. Tarjeta de una publicación de Comunidad (F2): categoría, autor, foto, mensaje, «Voy» y
 * comentarios. Tocarla abre el detalle (salvo `sinEnlace`, en el propio detalle).
 */
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { ETIQUETA_PUBLICACION, type Publicacion } from "../../modelos/comunidad";
import { ALTO_TACTIL, colorIcono, RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { BotonPrincipal } from "./BotonPrincipal";
import { FotoGuardada } from "./FotoGuardada";
import { Icono } from "./Icono";
import { Texto } from "./Texto";
import { ESTILO_PUBLICACION } from "./estiloPublicacion";

export function TarjetaPublicacion({
  publicacion: p,
  ocupado,
  onVoy,
  sinEnlace,
}: {
  publicacion: Publicacion;
  ocupado: boolean;
  onVoy: () => void;
  sinEnlace?: boolean;
}) {
  const { tema } = useTema();
  const c = tema.colores;
  const estilo = ESTILO_PUBLICACION[p.categoria];
  const tono = colorIcono(estilo.color, tema.oscuro);
  const abrir = () => router.push({ pathname: "/comunidad/[id]", params: { id: p.id } });

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <Pressable
        accessibilityRole={sinEnlace ? undefined : "button"}
        accessibilityLabel={`${ETIQUETA_PUBLICACION[p.categoria]} de ${p.autorCorto}, ${p.antiguedad}. ${p.mensaje}`}
        disabled={sinEnlace}
        onPress={abrir}
        style={estilos.cuerpo}
      >
        <View style={estilos.fila}>
          <View style={[estilos.circulo, { backgroundColor: tono.fondo }]}>
            <Icono nombre={estilo.icono} tamano={28} color={tono.icono} />
          </View>
          <View style={{ flex: 1 }}>
            <Texto variante="etiqueta">{ETIQUETA_PUBLICACION[p.categoria]}</Texto>
            <Texto variante="ayuda" color={c.textoSecundario}>{`${p.esMia ? "Tú" : p.autorCorto} · ${p.antiguedad}`}</Texto>
          </View>
        </View>
        <FotoGuardada ruta={p.fotoPath} descripcion={`Foto de ${ETIQUETA_PUBLICACION[p.categoria]}`} />
        {p.mensaje ? <Texto>{p.mensaje}</Texto> : null}
      </Pressable>

      <View style={estilos.pie}>
        <BotonPrincipal
          estilo={estilos.voy}
          variante={p.voy ? "listo" : "secundarioListo"}
          icono={p.voy ? "check" : "walk"}
          cargando={ocupado}
          accessibilityHint={p.voy ? "Toca para quitar tu asistencia" : "Toca para avisar que irás"}
          onPress={onVoy}
        >
          {p.voy ? "Voy ✓" : "Voy"}
        </BotonPrincipal>
        {!sinEnlace ? (
          <Pressable accessibilityRole="button" onPress={abrir} style={estilos.comentarios} hitSlop={8}>
            <Icono nombre="comment-outline" tamano={24} color={c.accionTexto} />
            <Texto variante="etiqueta" color={c.accionTexto}>{p.comentarios > 0 ? `${p.comentarios}` : "Comentar"}</Texto>
          </Pressable>
        ) : null}
      </View>
      <Texto variante="ayuda" color={c.textoSecundario}>
        {p.asistentes === 0 ? "Nadie marcó «Voy» todavía" : p.asistentes === 1 ? "1 vecino va" : `${p.asistentes} vecinos van`}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1.5, borderRadius: RADIO.l, padding: 14, gap: 10 },
  cuerpo: { gap: 10 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12 },
  circulo: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  pie: { flexDirection: "row", alignItems: "center", gap: 12 },
  voy: { flex: 1 },
  comentarios: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: ALTO_TACTIL, paddingHorizontal: 8 },
});
