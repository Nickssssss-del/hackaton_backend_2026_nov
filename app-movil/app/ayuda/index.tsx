/**
 * Vista. Ayuda entre vecinos (mockup pág. 11).
 * - Botón grande "Pedir un favor"
 * - Lista "Vecinos que piden ayuda" con ícono de categoría, descripción, nombre corto, "de tu zona" y antigüedad
 * - Lee pedidos_cercanos con react-query (llamando antes a asegurarSesion)
 * - Copia guardada sin internet (persistencia react-query), con aviso amarillo
 * - Sin zona en el perfil: "Elige tu barrio para ver los pedidos" con botón al registro
 * - Acceso a "Mis pedidos"
 */
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { listarPedidosCercanos } from "../../src/modelos/pedidosRepositorio";
import { usePerfil } from "../../src/controladores/usePerfil";
import { useConexion } from "../../src/controladores/useConexion";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { Aviso } from "../../src/vistas/componentes/Aviso";
import { Boton } from "../../src/vistas/componentes/Boton";
import { useTema } from "../../src/vistas/tema/useTema";
import { useQuery } from "@tanstack/react-query";
import { mensajeDeError } from "../../src/controladores/errores";
import { asegurarSesionAnonima } from "../../src/modelos/supabase";

const ICONOS_CATEGORIA: Record<string, string> = {
  arreglos: "🔧",
  compras: "🛒",
  transporte: "🚌",
  salud: "🏥",
};

function formatearCategoria(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function PantallaAyuda() {
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));
  const { perfil } = usePerfil();
  const conexion = useConexion();

  const consulta = useQuery({
    queryKey: ["pedidos-cercanos"],
    queryFn: async () => {
      await asegurarSesionAnonima();
      return listarPedidosCercanos();
    },
    enabled: !!perfil?.zonaId,
    gcTime: 1000 * 60 * 60 * 24,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  // Cuando no hay internet, react-query devuelve la copia persistida (dataUpdatedAt indica cuándo se guardó)
  const esCopia = conexion !== "conectado" && consulta.data && consulta.data.length > 0;
  const copiaFecha = esCopia && consulta.dataUpdatedAt
    ? new Date(consulta.dataUpdatedAt).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  const pedidos = consulta.data ?? [];
  const cargando = consulta.isLoading;
  const error = consulta.error ? mensajeDeError(consulta.error, "general") : null;

  const onVolver = () => router.back();
  const irAPedir = () => router.push("/ayuda/pedir");
  const irAMisPedidos = () => router.push("/ayuda/mis-pedidos");
  const irARegistro = () => router.push("/registro/nombre");

  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={onVolver} escuchar={() => {}} />

      <Text style={[estilos.titulo, { fontSize: tamano(24), color: tema.colores.texto }]}>Ayuda entre vecinos</Text>

      {conexion !== "conectado" && (
        <Aviso tipo="amarillo">Sin conexión. Se muestra la copia guardada.</Aviso>
      )}

      {copiaFecha && (
        <Aviso tipo="azul">{`Copia del ${copiaFecha}`}</Aviso>
      )}

      {!perfil?.zonaId ? (
        <View style={[estilos.sinZona, { backgroundColor: tema.colores.superficie }]}>
          <Text style={[estilos.sinZonaTexto, { fontSize: tamano(18), color: tema.colores.texto }]}>
            Elige tu barrio para ver los pedidos
          </Text>
          <Pressable onPress={irARegistro} style={[estilos.botonZona, { backgroundColor: tema.colores.accion }]}>
            <Text style={[estilos.botonZonaTexto, { fontSize: tamano(18), color: tema.colores.fondo }]}>Elegir mi barrio</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Pressable onPress={irAPedir} style={[estilos.botonGrande, { backgroundColor: tema.colores.accion, marginBottom: 16 }]}>
            <Text style={[estilos.botonGrandeTexto, { fontSize: tamano(22), color: tema.colores.fondo, fontWeight: "700" }]}>Pedir un favor</Text>
          </Pressable>

          <Text style={[estilos.seccionTitulo, { fontSize: tamano(20), color: tema.colores.texto }]}>Vecinos que piden ayuda</Text>

          {cargando && pedidos.length === 0 && (
            <View style={estilos.centrado}>
              <ActivityIndicator size="large" color={tema.colores.accion} />
            </View>
          )}

          {error && <Aviso tipo="amarillo">{error}</Aviso>}

          {!cargando && pedidos.length === 0 && (
            <View style={[estilos.vacio, { backgroundColor: tema.colores.superficie }]}>
              <Text style={[estilos.vacioTexto, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>
                No hay pedidos en tu zona ahora mismo.
              </Text>
            </View>
          )}

          {pedidos.map((pedido) => (
            <Pressable key={pedido.id} onPress={() => {}} style={[estilos.tarjetaPedido, { backgroundColor: tema.colores.superficie }]}>
              <View style={estilos.filaEncabezado}>
                <Text style={[estilos.iconoCategoria, { fontSize: tamano(24) }]}>{ICONOS_CATEGORIA[pedido.categoria]}</Text>
                <View style={estilos.infoCategoria}>
                  <Text style={[estilos.categoriaNombre, { fontSize: tamano(18), color: tema.colores.texto, fontWeight: "700" }]}>
                    {formatearCategoria(pedido.categoria)}
                  </Text>
                  <Text style={[estilos.antiguedad, { fontSize: tamano(14), color: tema.colores.textoSecundario }]}>
                    {pedido.antiguedad} · de tu zona
                  </Text>
                </View>
              </View>
              <Text style={[estilos.nombreCorto, { fontSize: tamano(16), color: tema.colores.textoSecundario }]}>{pedido.nombreCorto}</Text>
              <Text style={[estilos.descripcion, { fontSize: tamano(16), color: tema.colores.texto }]}>{pedido.descripcion}</Text>
              {pedido.esMio ? (
                <Text style={[estilos.esMio, { fontSize: tamano(14), color: tema.colores.confirmado }]}>Es tu pedido</Text>
              ) : pedido.yaOfreci ? (
                <Text style={[estilos.yaOfreci, { fontSize: tamano(14), color: tema.colores.textoSecundario }]}>Ya ofreciste ayuda</Text>
              ) : null}
            </Pressable>
          ))}

          <Pressable onPress={irAMisPedidos} style={[estilos.botonMisPedidos, { backgroundColor: tema.colores.superficie, borderWidth: 1, borderColor: tema.colores.textoSecundario, marginTop: 16 }]}>
            <Text style={[estilos.botonMisPedidosTexto, { fontSize: tamano(18), color: tema.colores.texto }]}>Mis pedidos</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 14, padding: 16, paddingBottom: 32 },
  titulo: { fontWeight: "700" },
  seccionTitulo: { fontWeight: "700" },
  sinZona: { alignItems: "center", padding: 24, borderRadius: 12, gap: 12 },
  sinZonaTexto: { textAlign: "center" },
  botonZona: { minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, width: "100%" },
  botonZonaTexto: { fontWeight: "700" },
  botonGrande: { minHeight: 64, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  botonGrandeTexto: { fontWeight: "700" },
  centrado: { alignItems: "center", justifyContent: "center", minHeight: 200 },
  vacio: { alignItems: "center", padding: 24, borderRadius: 12, gap: 12 },
  vacioTexto: { textAlign: "center" },
  tarjetaPedido: { borderRadius: 12, padding: 16, gap: 8 },
  filaEncabezado: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconoCategoria: {},
  infoCategoria: { flex: 1 },
  categoriaNombre: {},
  antiguedad: {},
  nombreCorto: { fontWeight: "500", marginTop: 4 },
  descripcion: { marginTop: 4, lineHeight: 22 },
  esMio: { marginTop: 4, fontWeight: "600" },
  yaOfreci: { marginTop: 4, fontStyle: "italic" },
  botonMisPedidos: { minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  botonMisPedidosTexto: { fontWeight: "700" },
});