/**
 * Vista. Mis pedidos (es_mio = true en pedidos_cercanos).
 * - Permite "Cancelar" y "Ya me ayudaron" (update del estado con valores EXACTOS del CHECK)
 * - Cuántos vecinos ofrecieron ayuda (conteo en ayudas_ofrecidas si la política lo permite)
 * - Texto "Quien quiera ayudarte te llamará"
 */
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMisPedidos } from "../../src/controladores/useAyuda";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { Aviso } from "../../src/vistas/componentes/Aviso";
import { useTema } from "../../src/vistas/tema/useTema";
import type { PedidoCercano } from "../../src/modelos/tipos";

export default function PantallaMisPedidos() {
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));
  const misPedidos = useMisPedidos();
  const ayudasOfrecidas = misPedidos.ayudasOfrecidas ?? {};

  const onVolver = () => router.back();

  const confirmarCancelar = (id: string) => {
    Alert.alert(
      "Cancelar pedido",
      "¿Seguro que quieres cancelar este pedido? No se puede deshacer.",
      [
        { text: "No", style: "cancel" },
        { text: "Sí, cancelar", style: "destructive", onPress: () => misPedidos.actualizarEstado({ id, estado: "cancelado" }) },
      ]
    );
  };

  const confirmarAtendido = (id: string) => {
    Alert.alert(
      "Ya me ayudaron",
      "¿Confirmas que ya recibiste ayuda para este pedido?",
      [
        { text: "No", style: "cancel" },
        { text: "Sí, ya me ayudaron", style: "default", onPress: () => misPedidos.actualizarEstado({ id, estado: "atendido" }) },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={onVolver} />

      <Text style={[estilos.titulo, { fontSize: tamano(24), color: tema.colores.texto }]}>Mis pedidos</Text>

      <Text style={[estilos.subtitulo, { fontSize: tamano(16), color: tema.colores.textoSecundario }]}>
        Quien quiera ayudarte te llamará
      </Text>

      {misPedidos.cargando && (
        <View style={estilos.centrado}>
          <Text style={[estilos.textoCargando, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>Cargando…</Text>
        </View>
      )}

      {misPedidos.error && <Aviso tipo="amarillo">{misPedidos.error}</Aviso>}

      {misPedidos.pedidos.length === 0 && !misPedidos.cargando && (
        <View style={[estilos.vacio, { backgroundColor: tema.colores.superficie }]}>
          <Text style={[estilos.vacioTexto, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>
            No tienes pedidos activos.
          </Text>
          <Pressable onPress={() => router.push("/ayuda/pedir")} style={[estilos.botonPedir, { backgroundColor: tema.colores.accion }]}>
            <Text style={[estilos.botonPedirTexto, { fontSize: tamano(18), color: tema.colores.fondo }]}>Pedir un favor</Text>
          </Pressable>
        </View>
      )}

      {misPedidos.pedidos.map((pedido: PedidoCercano) => (
        <View key={pedido.id} style={[estilos.tarjeta, { backgroundColor: tema.colores.superficie }]}>
          <View style={estilos.filaEncabezado}>
            <Text style={[estilos.iconoCategoria, { fontSize: tamano(24) }]}>
              {pedido.categoria === "arreglos" ? "🔧" : pedido.categoria === "compras" ? "🛒" : pedido.categoria === "transporte" ? "🚌" : "🏥"}
            </Text>
            <View style={estilos.infoCategoria}>
              <Text style={[estilos.categoriaNombre, { fontSize: tamano(18), color: tema.colores.texto, fontWeight: "700" }]}>
                {pedido.categoria.charAt(0).toUpperCase() + pedido.categoria.slice(1)}
              </Text>
              <Text style={[estilos.antiguedad, { fontSize: tamano(14), color: tema.colores.textoSecundario }]}>
                {pedido.antiguedad} · de tu zona
              </Text>
            </View>
          </View>
          <Text style={[estilos.descripcion, { fontSize: tamano(16), color: tema.colores.texto }]}>{pedido.descripcion}</Text>

          {/* Conteo de ayudas ofrecidas - la política ayudas_leer permite ver si eres el autor del pedido */}
          {(() => {
            const count = ayudasOfrecidas[pedido.id];
            return typeof count === "number" && count > 0 ? (
              <Text style={[estilos.ayudasCount, { fontSize: tamano(14), color: tema.colores.confirmado }]}>
                {count} vecino{count > 1 ? "s" : ""} ofrecieron ayuda
              </Text>
            ) : null;
          })()}

          <View style={estilos.botones}>
            {pedido.antiguedad && !pedido.antiguedad.includes("atendido") && !pedido.antiguedad.includes("cancelado") && (
              <>
                <Pressable
                  disabled={misPedidos.actualizando}
                  onPress={() => confirmarCancelar(pedido.id)}
                  style={[estilos.botonCancelar, { backgroundColor: tema.colores.peligro }]}
                >
                  <Text style={[estilos.botonCancelarTexto, { fontSize: tamano(18), color: "#FFFFFF" }]}>Cancelar</Text>
                </Pressable>
                <Pressable
                  disabled={misPedidos.actualizando}
                  onPress={() => confirmarAtendido(pedido.id)}
                  style={[estilos.botonAtendido, { backgroundColor: tema.colores.confirmado }]}
                >
                  <Text style={[estilos.botonAtendidoTexto, { fontSize: tamano(18), color: tema.colores.fondo }]}>Ya me ayudaron</Text>
                </Pressable>
              </>
            )}
          </View>

          {pedido.antiguedad?.includes("atendido") && (
            <Text style={[estilos.estadoAtendido, { fontSize: tamano(16), color: tema.colores.confirmado, fontWeight: "600" }]}>Pedido atendido</Text>
          )}
          {pedido.antiguedad?.includes("cancelado") && (
            <Text style={[estilos.estadoCancelado, { fontSize: tamano(16), color: tema.colores.peligro, fontWeight: "600" }]}>Pedido cancelado</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 16, padding: 16, paddingBottom: 32 },
  titulo: { fontWeight: "700" },
  subtitulo: { marginBottom: 8 },
  centrado: { alignItems: "center", justifyContent: "center", minHeight: 200 },
  textoCargando: { textAlign: "center" },
  vacio: { alignItems: "center", padding: 24, borderRadius: 12, gap: 12 },
  vacioTexto: { textAlign: "center" },
  tarjeta: { borderRadius: 12, padding: 16, gap: 8 },
  filaEncabezado: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconoCategoria: {},
  infoCategoria: { flex: 1 },
  categoriaNombre: {},
  antiguedad: {},
  descripcion: { marginTop: 4, lineHeight: 22 },
  ayudasCount: { marginTop: 8, fontStyle: "italic" },
  botones: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
  botonCancelar: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, minWidth: 140 },
  botonCancelarTexto: { fontWeight: "700" },
  botonAtendido: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, minWidth: 140 },
  botonAtendidoTexto: { fontWeight: "700" },
  estadoAtendido: { textAlign: "center", marginTop: 8 },
  estadoCancelado: { textAlign: "center", marginTop: 8 },
  botonPedir: { minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, width: "100%" },
  botonPedirTexto: { fontWeight: "700" },
});