/**
 * Vista. Mis servicios (es_mio = true en servicios_publicos).
 * Permite Editar (reutiliza /publicar/detalles con id) y Borrar con confirmación.
 */
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useMisServicios } from "../src/controladores/useMisServicios";
import { Encabezado } from "../src/vistas/componentes/Encabezado";
import { Aviso } from "../src/vistas/componentes/Aviso";
import { Boton } from "../src/vistas/componentes/Boton";
import { useTema } from "../src/vistas/tema/useTema";

export default function PantallaMisServicios() {
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));
  const misServicios = useMisServicios();

  const [borrarConfirmar, setBorrarConfirmar] = useState<string | null>(null);

  const onVolver = () => router.back();

  const confirmarBorrar = (id: string) => {
    Alert.alert(
      "Borrar servicio",
      "¿Seguro que quieres borrar este servicio? No se puede deshacer.",
      [
        { text: "No", style: "cancel" },
        { text: "Sí, borrar", style: "destructive", onPress: () => misServicios.borrar(id) },
      ]
    );
  };

  const irAEditar = (id: string) => {
    router.push(`/publicar/detalles?id=${id}`);
  };

  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={onVolver} />

      <Text style={[estilos.titulo, { fontSize: tamano(24), color: tema.colores.texto }]}>Mis servicios</Text>

      <Aviso tipo="amarillo">
        Si un servicio recibe varios reportes, se oculta hasta que lo revisen.
      </Aviso>

      {misServicios.cargando && (
        <View style={estilos.centrado}>
          <Text style={[estilos.textoCargando, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>Cargando…</Text>
        </View>
      )}

      {misServicios.error && <Aviso tipo="amarillo">{misServicios.error}</Aviso>}

      {misServicios.servicios.length === 0 && !misServicios.cargando && (
        <View style={[estilos.vacio, { backgroundColor: tema.colores.superficie }]}>
          <Text style={[estilos.vacioTexto, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>
            No tienes servicios publicados aún.
          </Text>
          <Pressable onPress={() => router.push("/publicar")} style={[estilos.botonOfrecer, { backgroundColor: tema.colores.accion }]}>
            <Text style={[estilos.botonOfrecerTexto, { fontSize: tamano(18), color: tema.colores.fondo }]}>Publicar mi primer servicio</Text>
          </Pressable>
        </View>
      )}

      {misServicios.servicios.map((servicio) => (
        <View key={servicio.id} style={[estilos.tarjeta, { backgroundColor: tema.colores.superficie }]}>
          <Text style={[estilos.nombre, { fontSize: tamano(20), color: tema.colores.texto }]}>{servicio.nombre}</Text>
          <Text style={[estilos.oficio, { fontSize: tamano(16), color: tema.colores.textoSecundario }]}>{servicio.oficio}</Text>
          {servicio.descripcion && (
            <Text style={[estilos.descripcion, { fontSize: tamano(16), color: tema.colores.texto }]}>{servicio.descripcion}</Text>
          )}
          <View style={estilos.botones}>
            <Pressable
              disabled={misServicios.editarEnviando}
              onPress={() => irAEditar(servicio.id)}
              style={[estilos.botonSecundario, { backgroundColor: tema.colores.superficie, borderWidth: 1, borderColor: tema.colores.textoSecundario }]}
            >
              <Text style={[estilos.botonSecundarioTexto, { fontSize: tamano(18), color: tema.colores.texto }]}>Editar</Text>
            </Pressable>
            <Pressable
              disabled={misServicios.borrarEnviando}
              onPress={() => confirmarBorrar(servicio.id)}
              style={[estilos.botonSecundario, { backgroundColor: tema.colores.peligro }]}
            >
              <Text style={[estilos.botonSecundarioTexto, { fontSize: tamano(18), color: "#FFFFFF" }]}>Borrar</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 16, padding: 16, paddingBottom: 32 },
  titulo: { fontWeight: "700" },
  centrado: { alignItems: "center", justifyContent: "center", minHeight: 200 },
  textoCargando: { textAlign: "center" },
  vacio: { alignItems: "center", padding: 24, borderRadius: 12, gap: 12 },
  vacioTexto: { textAlign: "center" },
  tarjeta: { borderRadius: 12, padding: 16, gap: 8 },
  nombre: { fontWeight: "700" },
  oficio: { fontWeight: "500" },
  descripcion: { lineHeight: 24 },
  botones: { flexDirection: "row", gap: 10, marginTop: 8 },
  botonSecundario: { flex: 1, minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  botonSecundarioTexto: { fontWeight: "700" },
  botonOfrecer: { minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, width: "100%" },
  botonOfrecerTexto: { fontWeight: "700" },
});