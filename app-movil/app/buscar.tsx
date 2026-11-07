/**
 * Vista. Buscar servicios.
 */
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useServicios } from "../src/controladores/useServicios";
import { useVoz } from "../src/controladores/useVoz";
import { distanciaMetros, minutosAPie } from "../src/modelos/geo";
import { OFICIOS } from "../src/modelos/tipos";
import { BotonVoz } from "../src/vistas/componentes/BotonVoz";
import { TarjetaServicio } from "../src/vistas/TarjetaServicio";

export default function PantallaInicio() {
  const servicios = useServicios();
  const [textoVoz, setTextoVoz] = useState("");
  const voz = useVoz((texto) => {
    setTextoVoz(texto);
    servicios.setBusqueda(texto);
  });

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <BotonVoz escuchando={voz.escuchando} onPulsar={() => void voz.alternar()} />
      {voz.teclado ? (
        <TextInput
          value={textoVoz}
          onChangeText={(valor) => {
            setTextoVoz(valor);
            servicios.setBusqueda(valor);
          }}
          placeholder="Escribe lo que buscas"
          style={estilos.teclado}
        />
      ) : null}
      <View style={estilos.enlaces}>
        <Link href="/publicar">Publicar servicio</Link>
        <Link href="/pedir">Pedir un favor</Link>
        <Link href="/emergencia">Emergencia</Link>
        <Link href="/registro/nombre">Registro</Link>
        <Link href="/mis-datos">Mis datos</Link>
      </View>
      <Pressable onPress={() => servicios.setSoloAbiertos(!servicios.soloAbiertos)} style={estilos.chip}>
        <Text>{servicios.soloAbiertos ? "· Abierto ahora" : "Abierto ahora"}</Text>
      </Pressable>
      <View style={estilos.chips}>
        {OFICIOS.map((oficio) => (
          <Pressable key={oficio} onPress={() => servicios.setOficio(servicios.oficio === oficio ? null : oficio)} style={estilos.chip}>
            <Text>{servicios.oficio === oficio ? `· ${oficio}` : oficio}</Text>
          </Pressable>
        ))}
      </View>
      {servicios.cargando ? <ActivityIndicator /> : null}
      {servicios.error ? <Text>{servicios.error}</Text> : null}
      {servicios.servicios.map((servicio) => {
        const minutos =
          servicios.ubicacion && servicio.lat !== undefined && servicio.lng !== undefined
            ? minutosAPie(distanciaMetros(servicios.ubicacion.lat, servicios.ubicacion.lng, servicio.lat, servicio.lng))
            : undefined;
        return (
          <Link key={servicio.id} href={`/servicio/${servicio.id}`}>
            <TarjetaServicio servicio={servicio} minutos={minutos} />
          </Link>
        );
      })}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 12, padding: 16 },
  enlaces: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, justifyContent: "center", paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#f4f1ea" },
  teclado: { minHeight: 72, fontSize: 28, borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#f4f1ea" },
});
