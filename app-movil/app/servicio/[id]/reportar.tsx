/**
 * Vista. Reportar servicio:
 * - Motivos EXACTOS del CHECK como botones grandes
 * - Confirmación Sí / No
 * - Insert en reportes con exigirEscritura()
 * - Mensaje de gracias neutro
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useReportarServicio } from "../../../src/controladores/useReportarServicio";
import { exigirEscritura } from "../../../src/controladores/guarda";
import { usePerfil } from "../../../src/controladores/usePerfil";
import { useConexion } from "../../../src/controladores/useConexion";
import { Encabezado } from "../../../src/vistas/componentes/Encabezado";
import { useTema } from "../../../src/vistas/tema/useTema";

const MOTIVOS_REPORTE: { id: "estafa" | "datos_falsos" | "ofensivo" | "no_existe" | "otro"; etiqueta: string; icono: string }[] = [
  { id: "estafa", etiqueta: "Parece una estafa", icono: "⚠️" },
  { id: "datos_falsos", etiqueta: "Datos falsos", icono: "📝" },
  { id: "ofensivo", etiqueta: "Es ofensivo", icono: "💢" },
  { id: "no_existe", etiqueta: "Ya no existe", icono: "🚫" },
  { id: "otro", etiqueta: "Otro motivo", icono: "❓" },
];

export default function PantallaReportar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));
  const { perfil } = usePerfil();
  const conexion = useConexion();

  const reportar = useReportarServicio();
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<"estafa" | "datos_falsos" | "ofensivo" | "no_existe" | "otro" | null>(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [avisoEscritura, setAvisoEscritura] = useState<string | null>(null);

  const onVolver = useCallback(() => {
    if (mostrarConfirmacion) {
      setMostrarConfirmacion(false);
    } else {
      router.back();
    }
  }, [mostrarConfirmacion, router]);

  const confirmar = useCallback(async () => {
    if (!motivoSeleccionado) return;
    setAvisoEscritura(null);
    const ok = await exigirEscritura({
      perfil,
      internetReal: conexion === "conectado",
      irAlRegistro: () => router.push("/registro/nombre"),
      avisar: (msg) => setAvisoEscritura(msg),
      ejecutar: async () => {
        await reportar.reportar({ servicioId: id, motivo: motivoSeleccionado! });
      },
    });
    if (ok && reportar.mensaje) {
      setMostrarConfirmacion(false);
      setMotivoSeleccionado(null);
      setTimeout(() => router.back(), 2000);
    }
  }, [id, motivoSeleccionado, perfil, conexion, router, reportar]);

  const sinInternet = conexion !== "conectado";

  if (!mostrarConfirmacion) {
    return (
      <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
        <Encabezado onVolver={onVolver} />
        <Text style={[estilos.titulo, { fontSize: tamano(22), color: tema.colores.texto }]}>Reportar servicio</Text>
        <Text style={[estilos.subtitulo, { fontSize: tamano(16), color: tema.colores.textoSecundario }]}>Elige el motivo (obligatorio)</Text>
        <View style={estilos.motivosList}>
          {MOTIVOS_REPORTE.map((motivo) => (
            <Pressable
              key={motivo.id}
              onPress={() => {
                setMotivoSeleccionado(motivo.id);
                setMostrarConfirmacion(true);
              }}
              disabled={sinInternet}
              style={[estilos.motivoBtn, { backgroundColor: tema.colores.superficie, opacity: sinInternet ? 0.6 : 1 }]}
            >
              <Text style={[estilos.motivoIcono, { fontSize: tamano(28) }]}>{motivo.icono}</Text>
              <Text style={[estilos.motivoEtiqueta, { fontSize: tamano(18), color: tema.colores.texto, fontWeight: "500" }]}>{motivo.etiqueta}</Text>
            </Pressable>
          ))}
        </View>
        {sinInternet && (
          <View style={estilos.avisoSinInternet}>
            <Text style={estilos.avisoSinInternetTexto}>Necesitas internet para reportar.</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // Pantalla de confirmación
  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <View>
        <Encabezado onVolver={onVolver} />
    <Text style={[estilos.titulo, { fontSize: tamano(22), color: tema.colores.texto, textAlign: "center" }]}>¿Confirmas el reporte?</Text>
        <Text style={[estilos.subtitulo, { fontSize: tamano(18), color: tema.colores.textoSecundario }, { textAlign: "center", marginTop: 8 }]}>
          {MOTIVOS_REPORTE.find((m) => m.id === motivoSeleccionado)?.etiqueta}
        </Text>
        {sinInternet && (
          <View style={estilos.avisoSinInternet}>
            <Text style={estilos.avisoSinInternetTexto}>Necesitas internet para reportar.</Text>
          </View>
        )}
        <View style={estilos.botonesFinales}>
          <Pressable onPress={() => setMostrarConfirmacion(false)} style={[estilos.botonCancelar, { backgroundColor: tema.colores.superficie, borderWidth: 1, borderColor: tema.colores.textoSecundario }]}>
            <Text style={[estilos.botonCancelarTexto, { fontSize: tamano(20), color: tema.colores.texto }]}>No</Text>
          </Pressable>
          <Pressable
            onPress={confirmar}
            disabled={reportar.enviando || sinInternet}
            style={[estilos.botonConfirmar, { backgroundColor: reportar.enviando || sinInternet ? tema.colores.textoSecundario : tema.colores.peligro }]}
          >
            <Text style={[estilos.botonConfirmarTexto, { fontSize: tamano(20), color: tema.colores.fondo }]}>{reportar.enviando ? "Enviando…" : "Sí"}</Text>
          </Pressable>
        </View>
        {reportar.mensaje && (
          <View style={[estilos.mensajeToast, { backgroundColor: tema.colores.aviso, marginTop: 16 }]}>
            <Text style={[estilos.mensajeToastTexto, { fontSize: tamano(16), color: tema.colores.avisoTexto, textAlign: "center" }]}>{reportar.mensaje}</Text>
          </View>
        )}
        {reportar.error && (
          <Text style={[estilos.errorToast, { fontSize: tamano(16), color: tema.colores.peligro, marginTop: 16, textAlign: "center" }]}>{reportar.error}</Text>
        )}
        {avisoEscritura && (
          <Text style={[estilos.avisoEscritura, { fontSize: tamano(16), color: tema.colores.peligro, marginTop: 12, textAlign: "center" }]}>{avisoEscritura}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 16, padding: 16, paddingBottom: 32 },
  titulo: { fontWeight: "700", textAlign: "center" },
  subtitulo: { textAlign: "center" },
  motivosList: { gap: 10, marginTop: 16 },
  motivoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  motivoIcono: {},
  motivoEtiqueta: { flex: 1, fontWeight: "500" },
  avisoSinInternet: { backgroundColor: "#FFF1C2", borderRadius: 8, padding: 12, marginTop: 16 },
  avisoSinInternetTexto: { fontSize: 16, fontWeight: "500", color: "#3D2E00", textAlign: "center" },
  botonesFinales: { flexDirection: "row", gap: 12, marginTop: 24 },
  botonCancelar: { flex: 1, minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  botonCancelarTexto: { fontWeight: "700" },
  botonConfirmar: { flex: 1, minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  botonConfirmarTexto: { fontWeight: "700" },
  mensajeToast: { borderRadius: 8, padding: 12 },
  mensajeToastTexto: { fontWeight: "500" },
  errorToast: { textAlign: "center" },
  avisoEscritura: { textAlign: "center" },
});