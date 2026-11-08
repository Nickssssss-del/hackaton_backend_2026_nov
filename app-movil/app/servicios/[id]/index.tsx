/**
 * Vista. E3 · Detalle del negocio (Mockup v4, p. 18).
 * Dibujo con el color de su categoría, nombre, Abierto/Cerrado, minutos a pie y tres botones:
 * - Llamar (verde): abre el marcador con el celular que el negocio publicó.
 * - Ir (azul): indicaciones a pie en Google Maps.
 * - Visto bueno con un toque (amarillo, con el total). La primera vez pide el celular (D-03).
 * Debajo, el comentario destacado del visto bueno y los comentarios de vecinos (vista
 * comentarios_visibles, script 07). Pie: «Comentar con mi voz» → tabla comentarios.
 * Si el negocio tiene foto en el bucket `fotos`, se muestra en lugar del dibujo.
 * Si el negocio es mío: Editar y Borrar (en «Mis servicios»), sin visto bueno ni reporte.
 */
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { faltaParaEscribir } from "../../../src/controladores/useAyudaVecinos";
import { useComentarios } from "../../../src/controladores/useComunidad";
import { useServicios } from "../../../src/controladores/useServicios";
import { textoMinutos, urlComoLlegar, useVistoBueno, useYaDiVistoBueno } from "../../../src/controladores/useServiciosV4";
import { distanciaMetros, minutosAPie } from "../../../src/modelos/geo";
import { etiquetaOficio, nombreServicio } from "../../../src/modelos/categoriasServicio";
import { BotonPrincipal } from "../../../src/vistas/componentes/BotonPrincipal";
import { estiloOficio } from "../../../src/vistas/componentes/estiloCategoriaServicio";
import { FotoGuardada } from "../../../src/vistas/componentes/FotoGuardada";
import { Icono, type NombreIcono } from "../../../src/vistas/componentes/Icono";
import { Insignia } from "../../../src/vistas/componentes/Insignia";
import { Mensaje } from "../../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../../src/vistas/componentes/Pantalla";
import { Texto } from "../../../src/vistas/componentes/Texto";
import { ALTO_TACTIL, colorIcono, RADIO } from "../../../src/vistas/tema/tokens";
import { useTema } from "../../../src/vistas/tema/useTema";

export default function DetalleNegocio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tema } = useTema();
  const c = tema.colores;
  const servicios = useServicios();
  const servicio = servicios.todos.find((s) => s.id === id);
  const vb = useVistoBueno();
  const { yaDi, marcar } = useYaDiVistoBueno(id);
  const com = useComentarios(id ? { servicioId: id } : null);
  const [aviso, setAviso] = useState<string | null>(null);
  const esperaCelular = useRef(false);

  const darVistoBueno = useCallback(async () => {
    if (!id) return;
    setAviso(null);
    const falta = await faltaParaEscribir();
    if (falta === "celular") {
      esperaCelular.current = true;
      router.push("/perfil/celular");
      return;
    }
    if (falta === "registro") {
      setAviso("Primero elige tu barrio: Mis datos › Mi barrio.");
      return;
    }
    try {
      await vb.dar({ servicioId: id });
      marcar();
    } catch {
      // El mensaje se muestra con vb.error.
    }
  }, [id, vb, marcar]);

  const darRef = useRef(darVistoBueno);
  darRef.current = darVistoBueno;

  // Al volver de /perfil/celular con el número guardado, el visto bueno se envía solo.
  useFocusEffect(
    useCallback(() => {
      if (!esperaCelular.current) return;
      esperaCelular.current = false;
      void faltaParaEscribir().then((falta) => {
        if (falta === null) void darRef.current();
      });
    }, []),
  );

  if (!servicio) {
    return (
      <Pantalla titulo="Negocio" volver>
        {servicios.cargando ? (
          <Texto variante="ayuda">Cargando…</Texto>
        ) : (
          <Mensaje tono="info">Este negocio ya no está en la lista.</Mensaje>
        )}
      </Pantalla>
    );
  }

  const nombre = nombreServicio(servicio);
  const estilo = estiloOficio(servicio.oficio);
  const tono = colorIcono(estilo.color, tema.oscuro);
  const minutos = textoMinutos(
    servicios.ubicacion && servicio.lat !== undefined && servicio.lng !== undefined
      ? minutosAPie(distanciaMetros(servicios.ubicacion.lat, servicios.ubicacion.lng, servicio.lat, servicio.lng), servicios.cuestaCaminar)
      : undefined,
  );
  const tieneHorario = Boolean(servicio.horaApertura && servicio.horaCierre);
  const urlIr = urlComoLlegar(servicio);
  const total = servicio.vistoBuenoTotal;

  const textoEscuchar = [
    nombre,
    etiquetaOficio(servicio.oficio),
    tieneHorario ? (servicio.abiertoAhora ? "Abierto" : "Cerrado") : null,
    minutos ? `A ${minutos} a pie` : null,
    `${total} ${total === 1 ? "vecino le dio" : "vecinos le dieron"} visto bueno`,
    servicio.comentarioTexto ? `${servicio.comentarioAutor ?? "Un vecino"} dice: ${servicio.comentarioTexto}` : null,
    servicio.contacto ? "Toca Llamar para hablar con el negocio" : "Este negocio no publicó su celular",
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <Pantalla
      volver
      textoEscuchar={textoEscuchar}
      pie={
        servicio.esMio ? undefined : (
          <BotonPrincipal
            variante="tocar"
            icono="microphone"
            onPress={() => router.push({ pathname: "/servicios/[id]/comentar", params: { id: servicio.id } })}
          >
            Comentar con mi voz
          </BotonPrincipal>
        )
      }
    >
      {/* Foto del negocio (bucket `fotos`) o, si no tiene, su ícono sobre el color de la categoría. */}
      <FotoGuardada ruta={servicio.fotoPath} descripcion={`Foto de ${nombre}`} />
      {servicio.fotoPath ? null : (
        <View
          style={[estilos.dibujo, { backgroundColor: tono.fondo }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icono nombre={estilo.icono} tamano={84} color={tono.icono} />
        </View>
      )}

      <Texto variante="titulo" accessibilityRole="header">{nombre}</Texto>
      <View style={estilos.insignias}>
        {tieneHorario ? <Insignia tono={servicio.abiertoAhora ? "verde" : "gris"} texto={servicio.abiertoAhora ? "Abierto" : "Cerrado"} /> : null}
        {minutos ? <Insignia tono="azul" texto={`${minutos} a pie`} /> : null}
        {!tieneHorario && !minutos ? <Insignia tono="gris" texto={etiquetaOficio(servicio.oficio)} /> : null}
      </View>

      <View style={estilos.botones}>
        <BotonCuadro
          icono="phone"
          texto="Llamar"
          fondo={c.confirmado}
          color={c.sobreColor}
          borde={c.confirmado}
          desactivado={!servicio.contacto}
          etiqueta={servicio.contacto ? `Llamar a ${nombre}` : "Llamar. Este negocio no publicó su celular"}
          onPress={() => servicio.contacto && void Linking.openURL(`tel:${servicio.contacto.replace(/[^\d+]/g, "")}`)}
        />
        <BotonCuadro
          icono="map-marker-outline"
          texto="Ir"
          fondo={c.superficie}
          color={c.accionTexto}
          borde={c.accion}
          desactivado={!urlIr}
          etiqueta={urlIr ? `Cómo llegar a ${nombre}` : "Ir. Este negocio no tiene ubicación"}
          onPress={() => urlIr && void Linking.openURL(urlIr)}
        />
        {servicio.esMio ? null : (
          <BotonCuadro
            icono={yaDi ? "thumb-up" : "thumb-up-outline"}
            texto={vb.enviando ? "…" : String(total)}
            fondo={yaDi ? c.aviso : c.superficie}
            color={c.avisoTexto}
            borde={c.avisoBorde}
            etiqueta={yaDi ? `Ya diste tu visto bueno. ${total} en total` : `Dar mi visto bueno. Tiene ${total}`}
            onPress={() => {
              if (yaDi) setAviso("Ya diste tu visto bueno a este negocio.");
              else void darVistoBueno();
            }}
          />
        )}
      </View>

      {vb.hecho ? <Mensaje tono="listo">¡Gracias! Tu visto bueno ya cuenta.</Mensaje> : null}
      {aviso ? <Mensaje tono="info">{aviso}</Mensaje> : null}
      {vb.error ? <Mensaje tono="aviso">{vb.error}</Mensaje> : null}
      {!servicio.contacto ? <Texto variante="ayuda">Este negocio no publicó su celular.</Texto> : null}

      {servicio.comentarioTexto ? (
        <View style={[estilos.comentario, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <Texto variante="etiqueta" color={c.accionTexto}>{servicio.comentarioAutor ?? "Un vecino"}</Texto>
          <Texto>{`“${servicio.comentarioTexto}”`}</Texto>
        </View>
      ) : null}

      {com.comentarios.length > 0 ? (
        <>
          <Texto variante="etiqueta">{`Comentarios de vecinos (${com.comentarios.length})`}</Texto>
          {com.comentarios.slice(0, 5).map((k) => (
            <View key={k.id} style={[estilos.comentario, { backgroundColor: c.superficie, borderColor: c.borde }]}>
              <Texto variante="etiqueta" color={c.accionTexto}>{k.esMio ? "Tú" : k.autorCorto}</Texto>
              <Texto>{`“${k.texto}”`}</Texto>
            </View>
          ))}
        </>
      ) : null}
      {servicio.esMio && !servicio.visibleVecinos ? (
        <Mensaje tono="aviso">Tus vecinos no ven este negocio. Actívalo en «Cambiar mi negocio» › Mis vecinos pueden verlo.</Mensaje>
      ) : null}

      {servicio.esMio ? (
        <>
          <Mensaje tono="info">Este es tu negocio.</Mensaje>
          <BotonPrincipal variante="secundario" icono="pencil-outline" onPress={() => router.push({ pathname: "/servicios/publicar", params: { id: servicio.id } })}>
            Cambiar mi negocio
          </BotonPrincipal>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reportar este negocio"
          onPress={() => router.push({ pathname: "/servicios/[id]/reportar", params: { id: servicio.id } })}
          style={estilos.reportar}
          hitSlop={6}
        >
          <Icono nombre="flag-outline" tamano={22} color={c.textoSecundario} />
          <Texto variante="ayuda">Reportar</Texto>
        </Pressable>
      )}
    </Pantalla>
  );
}

function BotonCuadro({
  icono,
  texto,
  fondo,
  color,
  borde,
  etiqueta,
  desactivado,
  onPress,
}: {
  icono: NombreIcono;
  texto: string;
  fondo: string;
  color: string;
  borde: string;
  etiqueta: string;
  desactivado?: boolean;
  onPress: () => void;
}) {
  const { tema } = useTema();
  const c = tema.colores;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: Boolean(desactivado) }}
      disabled={desactivado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.cuadro,
        desactivado
          ? { backgroundColor: c.desactivado, borderColor: c.desactivado }
          : { backgroundColor: fondo, borderColor: borde, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icono nombre={icono} tamano={28} color={desactivado ? c.desactivadoTexto : color} />
      <Texto variante="etiqueta" centrado color={desactivado ? c.desactivadoTexto : color}>{texto}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  dibujo: { height: 150, borderRadius: RADIO.l, alignItems: "center", justifyContent: "center" },
  insignias: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  botones: { flexDirection: "row", gap: 10 },
  cuadro: {
    flex: 1,
    minHeight: ALTO_TACTIL + 36,
    borderRadius: RADIO.m,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  comentario: { borderWidth: 1.5, borderRadius: RADIO.l, padding: 14, gap: 4 },
  reportar: { flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 6, minHeight: ALTO_TACTIL, paddingHorizontal: 12 },
});
