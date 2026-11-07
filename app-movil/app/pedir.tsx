/**
 * Vista. Pedidos cercanos y formulario para pedir un favor.
 */
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { usePedirFavor } from "../src/controladores/usePedirFavor";
import { useVoz } from "../src/controladores/useVoz";
import type { CategoriaPedido } from "../src/modelos/tipos";
import { BotonVoz } from "../src/vistas/BotonVoz";

const CATEGORIAS: CategoriaPedido[] = ["arreglos", "compras", "transporte", "salud"];

export default function PantallaPedir() {
  const favor = usePedirFavor();
  const [categoria, setCategoria] = useState<CategoriaPedido>("arreglos");
  const [descripcion, setDescripcion] = useState("");
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const voz = useVoz(setDescripcion);

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <BotonVoz escuchando={voz.escuchando} onPulsar={() => void voz.alternar()} />
      <Text>Lo verán vecinos de tu zona.</Text>
      <Text>Nadie del barrio te va a pedir dinero por adelantado ni tus claves.</Text>
      {categoria === "salud" ? <Text>No escribas diagnósticos ni medicinas.</Text> : null}
      <View style={estilos.categorias}>
        {CATEGORIAS.map((item) => (
          <Pressable key={item} onPress={() => setCategoria(item)} style={estilos.categoria}>
            <Text>{item === categoria ? `· ${item}` : item}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={descripcion}
        onChangeText={setDescripcion}
        maxLength={140}
        placeholder="Qué necesitas"
        style={voz.teclado ? estilos.teclado : estilos.campo}
      />
      <Pressable
        accessibilityRole="button"
        disabled={favor.enviando}
        onPress={() => void favor.enviar({ categoria, descripcion })}
        style={estilos.enviar}
      >
        <Text style={estilos.enviarTexto}>Publicar pedido</Text>
      </Pressable>
      {favor.cargando ? <ActivityIndicator /> : null}
      {favor.error ? <Text>{favor.error}</Text> : null}
      {favor.contacto ? (
        <Pressable
          onPress={() => void Linking.openURL(`tel:${favor.contacto?.celular.replace(/[^\d+]/g, "")}`)}
          style={estilos.enviar}
        >
          <Text style={estilos.enviarTexto}>Llama a {favor.contacto.nombre}</Text>
        </Pressable>
      ) : null}
      {favor.pedidos.map((pedido) => (
        <View key={pedido.id} style={estilos.pedido}>
          <Text style={estilos.nombre}>{pedido.nombreCorto}</Text>
          <Text>{pedido.categoria} · de tu zona</Text>
          <Text>{pedido.descripcion}</Text>
          <Text>{pedido.antiguedad}</Text>
          {pedido.esMio || pedido.yaOfreci ? null : confirmar === pedido.id ? (
            <Pressable onPress={() => favor.ayudar(pedido.id)} style={estilos.enviar}>
              <Text style={estilos.enviarTexto}>Sí, ofrecer ayuda</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setConfirmar(pedido.id)}>
              <Text>Yo ayudo</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: {
    gap: 12,
    padding: 16,
  },
  categorias: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoria: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f4f1ea",
  },
  campo: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f4f1ea",
  },
  enviar: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f4b3a",
  },
  enviarTexto: {
    color: "#ffffff",
    fontWeight: "700",
  },
  pedido: {
    gap: 4,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f4f1ea",
  },
  nombre: { fontWeight: "700" },
  teclado: {
    minHeight: 72,
    fontSize: 28,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f4f1ea",
  },
});
