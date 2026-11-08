/**
 * Vista. Detalle: horario, contacto, cómo llegar, Visto Bueno y Reportar.
 * La votación y el reporte se hacen en pantallas separadas (visto-bueno.tsx, reportar.tsx).
 * Si es_mio: botones Editar y Borrar funcionales.
 */
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useServicios } from "../../../src/controladores/useServicios";
import { distanciaMetros, minutosAPie } from "../../../src/modelos/geo";
import { useEscuchar } from "../../../src/controladores/useEscuchar";
import { Encabezado } from "../../../src/vistas/componentes/Encabezado";
import { useTema } from "../../../src/vistas/tema/useTema";
import { router } from "expo-router";
import { useMisServicios } from "../../../src/controladores/useMisServicios";

export default function PantallaServicio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));

  const servicios = useServicios();
  const misServicios = useMisServicios();
  const { escuchar, silenciar } = useEscuchar();

  const servicio = servicios.todos.find((item) => item.id === id);

  if (!servicio) {
    return (
      <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
        <Encabezado onVolver={() => router.back()} escuchar={() => escucharleerDetalle()} />
        <View style={[estilos.centrado, { padding: 24 }]}>
          <Text style={[estilos.texto, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>
            {servicios.cargando ? "Cargando…" : "No está en la copia del directorio."}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const minutos =
    servicios.ubicacion && servicio.lat !== undefined && servicio.lng !== undefined
      ? minutosAPie(distanciaMetros(servicios.ubicacion.lat, servicios.ubicacion.lng, servicio.lat, servicio.lng), servicios.cuestaCaminar)
      : undefined;

  const llegar = useCallback(() => {
    if (servicio.direccion) {
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(servicio.direccion)}`);
    } else if (servicio.lat !== undefined && servicio.lng !== undefined) {
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${servicio.lat},${servicio.lng}`);
    }
  }, [servicio]);

  const textoParaEscuchar = [
    servicio.nombre,
    formatearOficio(servicio.oficio),
    servicio.descripcion,
    servicio.horaApertura && servicio.horaCierre ? `Horario: ${formatearHora(servicio.horaApertura)} a ${formatearHora(servicio.horaCierre)}` : null,
    servicio.abiertoAhora ? "Abierto ahora" : "Cerrado ahora",
    servicio.precioDesde !== undefined ? `Desde ${servicio.precioDesde} soles` : null,
    servicio.direccion ? `Dirección: ${servicio.direccion}` : null,
    minutos ? `Aproximadamente ${minutos} minutos a pie` : null,
    servicio.contacto ? `Teléfono: ${formatearTelefono(servicio.contacto)}` : "El vecino no publicó su teléfono",
    servicio.vistoBuenoTotal > 0 ? `Tiene ${servicio.vistoBuenoTotal} vistos buenos, ${servicio.vistoBuenos300m} de vecinos a menos de 300 metros` : "Aún no tiene vistos buenos",
  ]
    .filter(Boolean)
    .join(". ");

  const escucharleerDetalle = useCallback(() => {
    escuchar(textoParaEscuchar, true);
  }, [escuchar, textoParaEscuchar]);

  const onVolver = useCallback(() => {
    silenciar();
    router.back();
  }, [silenciar, router]);

  const motivoMasVotado = obtenerMotivoMasVotado(servicio);

  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={onVolver} escuchar={escucharleerDetalle} />

      {/* Nombre y oficio */}
      <Text style={[estilos.nombre, { fontSize: tamano(24), color: tema.colores.texto }]}>{servicio.nombre}</Text>
      <View style={estilos.filaOficio}>
        <Text style={[estilos.oficioBadge, { fontSize: tamano(16), backgroundColor: tema.colores.superficie }]}>
          {iconoOficio(servicio.oficio)} {formatearOficio(servicio.oficio)}
        </Text>
        {servicio.precioDesde !== undefined && (
          <Text style={[estilos.precioBadge, { fontSize: tamano(16), backgroundColor: tema.colores.confirmado }]}>
            Desde S/ {servicio.precioDesde}
          </Text>
        )}
      </View>

      {/* Descripción */}
      {servicio.descripcion && (
        <Text style={[estilos.descripcion, { fontSize: tamano(18), color: tema.colores.texto }]}>{servicio.descripcion}</Text>
      )}

      {/* Horario */}
      {servicio.horaApertura && servicio.horaCierre ? (
        <View style={estilos.filaHorario}>
          <Text style={[estilos.horarioTexto, { fontSize: tamano(18), color: tema.colores.texto }]}>
            {formatearHora(servicio.horaApertura)} a. m. a {formatearHora(servicio.horaCierre)} p. m.
          </Text>
          <View style={[
            estilos.estadoAbierto,
            { backgroundColor: servicio.abiertoAhora ? tema.colores.confirmado : tema.colores.textoSecundario },
          ]}>
            <Text style={[estilos.estadoAbiertoTexto, { fontSize: tamano(16), color: tema.colores.fondo }]}>
              {servicio.abiertoAhora ? "Abierto ahora" : "Cerrado ahora"}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Dirección y distancia */}
      {servicio.direccion && (
        <Text style={[estilos.direccion, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>{servicio.direccion}</Text>
      )}
      {minutos !== undefined && (
        <Text style={[estilos.distancia, { fontSize: tamano(18), color: tema.colores.accion }]}>≈ {minutos} min a pie</Text>
      )}

      {/* Tarjeta verde "Visto Bueno de N vecinos" */}
      {(servicio.vistoBuenoTotal > 0 || servicio.vistoBuenos300m > 0) && (
        <View style={[estilos.tarjetaVistoBueno, { backgroundColor: tema.colores.confirmado }]}>
          <Text style={[estilos.vistoBuenoTitulo, { fontSize: tamano(20), color: tema.colores.fondo }]}>
            Visto Bueno de {servicio.vistoBuenos300m > 0 ? servicio.vistoBuenos300m : servicio.vistoBuenoTotal} vecino{servicio.vistoBuenos300m > 0 ? (servicio.vistoBuenos300m > 1 ? "s" : "") : servicio.vistoBuenoTotal > 1 ? "s" : ""}
          </Text>
          <Text style={[estilos.vistoBuenoTotal, { fontSize: tamano(16), color: tema.colores.fondo, opacity: 0.9 }]}>
            {servicio.vistoBuenoTotal} en total
          </Text>
          {motivoMasVotado && (
            <Text style={[estilos.motivoPrincipal, { fontSize: tamano(16), color: tema.colores.fondo }]}>
              Motivo principal: {motivoMasVotado}
            </Text>
          )}
          {servicio.comentarioDestacado && servicio.comentarioAutor && (
            <View style={estilos.comentarioDestacado}>
              <Text style={[estilos.comentarioTexto, { fontSize: tamano(16), color: tema.colores.fondo }]}>
                "{servicio.comentarioDestacado}"
              </Text>
              <Text style={[estilos.comentarioAutor, { fontSize: tamano(14), color: tema.colores.fondo, opacity: 0.8 }]}>
                — {servicio.comentarioAutor}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Botones de acción */}
      <View style={estilos.botonesAccion}>
        {/* Llamar */}
        {servicio.contacto ? (
          <Pressable
            onPress={() => void Linking.openURL(`tel:${servicio.contacto}`)}
            style={[estilos.botonPrimario, { backgroundColor: tema.colores.accion }]}
          >
            <Text style={[estilos.botonPrimarioTexto, { fontSize: tamano(18), color: tema.colores.fondo }]}>Llamar</Text>
          </Pressable>
        ) : (
          <Text style={[estilos.sinTelefono, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>Este vecino no publicó su teléfono.</Text>
        )}

        {/* WhatsApp */}
        {servicio.contacto && (
          <Pressable
            onPress={() => void Linking.openURL(`https://wa.me/51${servicio.contacto}`)}
            style={[estilos.botonSecundario, { backgroundColor: "#25D366" }]}
          >
            <Text style={[estilos.botonSecundarioTexto, { fontSize: tamano(18), color: "#FFFFFF" }]}>WhatsApp</Text>
          </Pressable>
        )}

        {/* Cómo llegar */}
        <Pressable
          onPress={llegar}
          style={[estilos.botonSecundario, { backgroundColor: tema.colores.superficie, borderWidth: 1, borderColor: tema.colores.textoSecundario }]}
        >
          <Text style={[estilos.botonSecundarioTexto, { fontSize: tamano(18), color: tema.colores.texto }]}>
            {servicio.direccion ? "Cómo llegar" : "Ubicación aproximada"}
          </Text>
        </Pressable>
      </View>

      {/* Si es mío: botones Editar y Borrar funcionales */}
      {servicio.esMio ? (
        <View style={estilos.botonesPropios}>
          <Pressable
            disabled={misServicios.editarEnviando}
            onPress={() => router.push(`/publicar/detalles?id=${servicio.id}`)}
            style={[estilos.botonSecundario, { backgroundColor: tema.colores.superficie, borderWidth: 1, borderColor: tema.colores.textoSecundario }]}
          >
            <Text style={[estilos.botonSecundarioTexto, { fontSize: tamano(18), color: tema.colores.texto }]}>Editar</Text>
          </Pressable>
          <Pressable
            disabled={misServicios.borrarEnviando}
            onPress={() => {
              Alert.alert(
                "Borrar servicio",
                "¿Seguro que quieres borrar este servicio? No se puede deshacer.",
                [
                  { text: "No", style: "cancel" },
                  { text: "Sí, borrar", style: "destructive", onPress: () => misServicios.borrar(servicio.id) },
                ]
              );
            }}
            style={[estilos.botonSecundario, { backgroundColor: tema.colores.peligro }]}
          >
            <Text style={[estilos.botonSecundarioTexto, { fontSize: tamano(18), color: "#FFFFFF" }]}>Borrar</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Dar mi Visto Bueno */}
          <Pressable
            onPress={() => router.push(`/servicio/${id}/visto-bueno`)}
            style={[estilos.botonPrimario, { backgroundColor: tema.colores.confirmado, marginTop: 16 }]}
          >
            <Text style={[estilos.botonPrimarioTexto, { fontSize: tamano(20), color: tema.colores.fondo }]}>Dar mi Visto Bueno</Text>
          </Pressable>

          {/* Reportar servicio (discreto, al final) */}
          <Pressable
            onPress={() => router.push(`/servicio/${id}/reportar`)}
            style={[estilos.botonReporte, { marginTop: 12 }]}
          >
            <Text style={[estilos.botonReporteTexto, { fontSize: tamano(16), color: tema.colores.textoSecundario }]}>Reportar servicio</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function iconoOficio(oficio: string): string {
  const iconos: Record<string, string> = {
    cafeteria: "☕",
    bodega: "🏪",
    panaderia: "🍞",
    restaurante: "🍽️",
    mercado: "🛒",
    farmacia: "💊",
    gasfitero: "🔧",
    electricista: "⚡",
    carpintero: "🪚",
    albanil: "🧱",
    pintor: "🎨",
    cerrajero: "🔐",
    costurera: "🧵",
    zapatero: "👞",
    peluqueria: "💇",
    lavanderia: "🧺",
    mecanico: "🔩",
    tecnico_celulares: "📱",
    jardinero: "🌿",
    mototaxi: "🛵",
    cuidado_personas: "🤝",
    clases_particulares: "📚",
    otro: "🔧",
  };
  return iconos[oficio] ?? "🔧";
}

function formatearOficio(oficio: string): string {
  return oficio
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function formatearHora(hora: string): string {
  const [h] = hora.split(":");
  const horaNum = parseInt(h, 10);
  return horaNum.toString();
}

function formatearTelefono(tel: string): string {
  return tel.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
}

function obtenerMotivoMasVotado(servicio: any): string | null {
  const votos = {
    "Trato amable": servicio.votosTratoAmable,
    "Buen precio": servicio.votosBuenPrecio,
    Confiable: servicio.votosConfiable,
    "Viene a domicilio": servicio.votosVieneDomicilio,
  };
  let max = 0;
  let motivo: string | null = null;
  for (const [k, v] of Object.entries(votos)) {
    if (v > max) {
      max = v;
      motivo = k;
    }
  }
  return motivo;
}

const estilos = StyleSheet.create({
  pagina: { gap: 14, padding: 16, paddingBottom: 32 },
  centrado: { alignItems: "center", justifyContent: "center", minHeight: 200 },
  texto: { textAlign: "center" },
  nombre: { fontWeight: "700" },
  filaOficio: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  oficioBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontWeight: "700" },
  precioBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontWeight: "700" },
  descripcion: { lineHeight: 26 },
  filaHorario: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  horarioTexto: { fontWeight: "500" },
  estadoAbierto: { minHeight: 52, paddingHorizontal: 12, borderRadius: 16, justifyContent: "center" },
  estadoAbiertoTexto: { fontWeight: "700", textAlign: "center" },
  direccion: { fontWeight: "500" },
  distancia: { fontWeight: "700" },
  tarjetaVistoBueno: { borderRadius: 12, padding: 16, gap: 8 },
  vistoBuenoTitulo: { fontWeight: "700" },
  vistoBuenoTotal: { fontWeight: "500" },
  motivoPrincipal: { fontWeight: "500", fontStyle: "italic" },
  comentarioDestacado: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.3)", paddingTop: 8, marginTop: 4 },
  comentarioTexto: { fontStyle: "italic" },
  comentarioAutor: { textAlign: "right", fontWeight: "500" },
  botonesAccion: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 8 },
  botonPrimario: { flex: 1, minWidth: 140, minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  botonPrimarioTexto: { fontWeight: "700" },
  botonSecundario: { flex: 1, minWidth: 120, minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  botonSecundarioTexto: { fontWeight: "700" },
  sinTelefono: { textAlign: "center", paddingVertical: 8 },
  botonesPropios: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 16 },
  fase5: { textAlign: "center", marginTop: 8 },
  botonReporte: { alignSelf: "center" },
  botonReporteTexto: { fontWeight: "500", textDecorationLine: "underline" },
});