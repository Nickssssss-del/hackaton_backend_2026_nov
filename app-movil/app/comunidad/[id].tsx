/**
 * Vista. Detalle de una publicación de Comunidad (F2): la publicación con «Voy», sus comentarios
 * (vista comentarios_visibles) y comentar con voz o teclado (tabla comentarios, 140 caracteres).
 * Reportar la publicación o un comentario ajeno (reportes_comunidad); borrar lo propio.
 */
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  useBorrarPublicacion,
  useComentarios,
  usePublicaciones,
  useReportarComunidad,
  useVoy,
} from "../../src/controladores/useComunidad";
import {
  ETIQUETA_MOTIVO_COMUNIDAD,
  ETIQUETA_PUBLICACION,
  MOTIVOS_REPORTE_COMUNIDAD,
  type DestinoReporte,
  type MotivoReporteComunidad,
} from "../../src/modelos/comunidad";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { TarjetaPublicacion } from "../../src/vistas/componentes/TarjetaPublicacion";
import { Texto } from "../../src/vistas/componentes/Texto";
import { ALTO_TACTIL, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

export default function DetallePublicacion() {
  const { tema } = useTema();
  const c = tema.colores;
  const { id } = useLocalSearchParams<{ id: string }>();
  const lista = usePublicaciones();
  const voy = useVoy();
  const publicacion = lista.publicaciones.find((p) => p.id === id);
  const com = useComentarios(id ? { publicacionId: id } : null);
  const borrarPub = useBorrarPublicacion();
  const reporte = useReportarComunidad();
  const [texto, setTexto] = useState("");
  const [reportando, setReportando] = useState<DestinoReporte | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  if (!publicacion) {
    return (
      <Pantalla titulo="Comunidad" volver>
        {lista.cargando ? <Texto variante="ayuda">Cargando…</Texto> : <Mensaje tono="aviso">Esta publicación ya no está disponible.</Mensaje>}
      </Pantalla>
    );
  }

  const enviar = async () => {
    if (await com.enviar(texto)) setTexto("");
  };

  const textoEscuchar = `${ETIQUETA_PUBLICACION[publicacion.categoria]} de ${publicacion.autorCorto}. ${publicacion.mensaje}. ${
    com.comentarios.length === 0 ? "Todavía no hay comentarios." : `Hay ${com.comentarios.length} comentarios.`
  }`;

  return (
    <Pantalla titulo={ETIQUETA_PUBLICACION[publicacion.categoria]} volver textoEscuchar={textoEscuchar}>
      <TarjetaPublicacion
        publicacion={publicacion}
        ocupado={voy.ocupado}
        sinEnlace
        onVoy={() => void voy.alternar(publicacion.id, !publicacion.voy)}
      />
      {voy.error ? <Mensaje tono="aviso">{voy.error}</Mensaje> : null}

      <Texto variante="subtitulo">Comentarios</Texto>
      {com.errorLectura ? <Mensaje tono="aviso">{com.errorLectura}</Mensaje> : null}
      {com.cargando ? <Texto variante="ayuda">Cargando comentarios…</Texto> : null}
      {!com.cargando && com.comentarios.length === 0 ? <Texto variante="ayuda" color={c.textoSecundario}>Todavía no hay comentarios.</Texto> : null}
      {com.comentarios.map((k) => (
        <View key={k.id} style={[estilos.comentario, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <Texto variante="etiqueta">{k.esMio ? "Tú" : k.autorCorto}</Texto>
          <Texto>{k.texto}</Texto>
          <View style={estilos.acciones}>
            {k.esMio ? (
              <Enlace icono="delete-outline" texto="Borrar" onPress={() => void com.borrar(k.id)} />
            ) : (
              <Enlace icono="flag-outline" texto="Reportar" onPress={() => setReportando({ comentarioId: k.id })} />
            )}
          </View>
        </View>
      ))}

      <CampoConVoz etiqueta="Escribe un comentario" ayuda="¡Ahí estaré!" valor={texto} onCambiar={setTexto} maxLength={140} />
      {com.error ? <Mensaje tono="aviso">{com.error}</Mensaje> : null}
      <BotonPrincipal variante="tocar" icono="send" cargando={com.ocupado} motivoDesactivado={texto.trim() ? null : "Escribe algo"} onPress={() => void enviar()}>
        Comentar
      </BotonPrincipal>

      {reportando ? (
        <View style={[estilos.caja, { borderColor: c.peligro, backgroundColor: c.superficie }]}>
          <Texto variante="subtitulo">¿Por qué lo reportas?</Texto>
          {MOTIVOS_REPORTE_COMUNIDAD.map((m: MotivoReporteComunidad) => (
            <BotonPrincipal
              key={m}
              variante="neutro"
              cargando={reporte.ocupado}
              onPress={() => void reporte.reportar(reportando, m).then((ok) => ok && setReportando(null))}
            >
              {ETIQUETA_MOTIVO_COMUNIDAD[m]}
            </BotonPrincipal>
          ))}
          <BotonPrincipal variante="secundario" onPress={() => setReportando(null)}>
            No reportar
          </BotonPrincipal>
        </View>
      ) : null}
      {reporte.error ? <Mensaje tono="aviso">{reporte.error}</Mensaje> : null}
      {reporte.hecho ? <Mensaje tono="listo">Gracias. Si tres vecinos lo reportan, se oculta y lo revisa el equipo.</Mensaje> : null}

      {publicacion.esMia ? (
        confirmarBorrar ? (
          <View style={[estilos.caja, { borderColor: c.peligro, backgroundColor: c.superficie }]}>
            <Texto variante="subtitulo">¿Borrar tu publicación?</Texto>
            <BotonPrincipal
              variante="emergencia"
              icono="delete-outline"
              cargando={borrarPub.ocupado}
              onPress={() => void borrarPub.borrar(publicacion.id).then((ok) => ok && router.back())}
            >
              Sí, borrar
            </BotonPrincipal>
            <BotonPrincipal variante="neutro" onPress={() => setConfirmarBorrar(false)}>
              No
            </BotonPrincipal>
          </View>
        ) : (
          <BotonPrincipal variante="neutro" icono="delete-outline" onPress={() => setConfirmarBorrar(true)}>
            Borrar mi publicación
          </BotonPrincipal>
        )
      ) : (
        <BotonPrincipal variante="neutro" icono="flag-outline" onPress={() => setReportando({ publicacionId: publicacion.id })}>
          Reportar esta publicación
        </BotonPrincipal>
      )}
      {borrarPub.error ? <Mensaje tono="aviso">{borrarPub.error}</Mensaje> : null}
    </Pantalla>
  );
}

function Enlace({ icono, texto, onPress }: { icono: "delete-outline" | "flag-outline"; texto: string; onPress: () => void }) {
  const { tema } = useTema();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={estilos.enlace} hitSlop={8}>
      <Icono nombre={icono} tamano={22} color={tema.colores.textoSecundario} />
      <Texto variante="ayuda" color={tema.colores.textoSecundario}>{texto}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  comentario: { borderWidth: 1, borderRadius: RADIO.m, padding: 12, gap: 4 },
  acciones: { flexDirection: "row", justifyContent: "flex-end" },
  enlace: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: ALTO_TACTIL, paddingHorizontal: 6 },
  caja: { borderWidth: 2, borderRadius: RADIO.l, padding: 14, gap: 10 },
});
