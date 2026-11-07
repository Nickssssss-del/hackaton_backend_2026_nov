/**
 * Vista. Detalle: horario, contacto, cómo llegar y visto bueno.
 */
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useDarVistoBueno } from "../../src/controladores/useDarVistoBueno";
import { exigirInternet } from "../../src/controladores/red";
import { useServicios } from "../../src/controladores/useServicios";
import { distanciaMetros, minutosAPie } from "../../src/modelos/distancia";
import { reportarServicio } from "../../src/modelos/serviciosRepositorio";
import type { MotivoReporte, MotivoVistoBueno } from "../../src/modelos/tipos";
import { mensajeDeError } from "../../src/controladores/errores";

const MOTIVOS: { id: MotivoVistoBueno; etiqueta: string }[] = [
  { id: "trato_amable", etiqueta: "Trato amable" },
  { id: "buen_precio", etiqueta: "Buen precio" },
  { id: "confiable", etiqueta: "Confiable" },
  { id: "viene_domicilio", etiqueta: "Viene a domicilio" },
];

const REPORTES: MotivoReporte[] = ["estafa", "datos_falsos", "ofensivo", "no_existe", "otro"];

export default function PantallaServicio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const servicios = useServicios();
  const visto = useDarVistoBueno();
  const servicio = servicios.todos.find((item) => item.id === id);
  const [comentario, setComentario] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [reporte, setReporte] = useState<string | null>(null);

  if (!servicio) {
    return <Text style={estilos.pagina}>{servicios.cargando ? "Cargando…" : "No está en la copia del directorio."}</Text>;
  }

  const minutos =
    servicios.ubicacion && servicio.lat !== undefined && servicio.lng !== undefined
      ? minutosAPie(distanciaMetros(servicios.ubicacion.lat, servicios.ubicacion.lng, servicio.lat, servicio.lng))
      : undefined;

  const llegar = () => {
    const consulta = servicio.direccion
      ? encodeURIComponent(servicio.direccion)
      : `${servicio.lat},${servicio.lng}`;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${consulta}`);
  };

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text style={estilos.nombre}>{servicio.nombre}</Text>
      <Text>{servicio.oficio}</Text>
      <Text>{servicio.descripcion}</Text>
      <Text>
        {servicio.horaApertura && servicio.horaCierre
          ? `${servicio.horaApertura} a ${servicio.horaCierre}`
          : "Sin horario publicado"}
      </Text>
      <Text>{servicio.abiertoAhora ? "Abierto ahora" : "Cerrado ahora"}</Text>
      {servicio.precioDesde !== undefined ? <Text>Desde S/ {servicio.precioDesde}</Text> : null}
      <Text>{servicio.vistoBuenoTotal} vistos buenos · {servicio.vistoBuenos300m} a 300 m</Text>
      {servicio.comentarioDestacado ? <Text>{servicio.comentarioDestacado}</Text> : null}
      {minutos ? <Text>≈ {minutos} min a pie</Text> : null}
      {servicio.contacto ? (
        <Pressable onPress={() => void Linking.openURL(`tel:${servicio.contacto}`)} style={estilos.boton}>
          <Text style={estilos.botonTexto}>Llamar</Text>
        </Pressable>
      ) : (
        <Text>Este vecino no publicó su teléfono.</Text>
      )}
      <Pressable onPress={llegar} style={estilos.boton}>
        <Text style={estilos.botonTexto}>{servicio.direccion ? "Cómo llegar" : "Ubicación aproximada"}</Text>
      </Pressable>
      {visto.listo ? <Text style={estilos.ok}>Gracias por tu Visto Bueno.</Text> : null}
      {visto.error ? <Text>{visto.error}</Text> : null}
      <TextInput value={comentario} onChangeText={setComentario} maxLength={140} placeholder="Comentario opcional, sin enlaces" style={estilos.campo} />
      <Pressable onPress={() => setMostrar(!mostrar)}>
        <Text>{mostrar ? "· Mostrar mi comentario con mi nombre corto" : "Mostrar mi comentario con mi nombre corto"}</Text>
      </Pressable>
      {MOTIVOS.map((motivo) => (
        <Pressable
          key={motivo.id}
          disabled={visto.enviando || servicio.esMio}
          onPress={() => visto.enviar({ servicioId: servicio.id, motivo: motivo.id, comentario, mostrarComentario: mostrar })}
          style={estilos.boton}
        >
          <Text style={estilos.botonTexto}>{motivo.etiqueta}</Text>
        </Pressable>
      ))}
      {servicio.esMio ? <Text>No puedes dar Visto Bueno a tu propio servicio.</Text> : null}
      <Text>Reportar</Text>
      {REPORTES.map((motivo) => (
        <Pressable
          key={motivo}
          onPress={() => {
            void (async () => {
              try {
                await exigirInternet();
                await reportarServicio(servicio.id, motivo);
                setReporte("Recibimos tu reporte.");
              } catch (causa) {
                setReporte(mensajeDeError(causa));
              }
            })();
          }}
        >
          <Text>{motivo}</Text>
        </Pressable>
      ))}
      {reporte ? <Text>{reporte}</Text> : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 10, padding: 16 },
  nombre: { fontSize: 22, fontWeight: "700" },
  campo: { minHeight: 48, borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#f4f1ea" },
  boton: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#1f4b3a" },
  botonTexto: { color: "#ffffff", fontWeight: "700" },
  ok: { color: "#1f7a4d", fontWeight: "700" },
});
