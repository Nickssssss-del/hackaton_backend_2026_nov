/**
 * Vista. Visto Bueno en 3 pasos:
 * 1. Motivo obligatorio (4 botones grandes con ícono)
 * 2. Comentario opcional (140 chars, contador, voz, validación sin enlaces) + casilla "Mostrar mi comentario con mi nombre corto"
 * 3. Confirmación Sí / No
 * El botón final llama a exigirEscritura() y luego a la mutación.
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useDarVistoBueno } from "../../../src/controladores/useDarVistoBueno";
import { exigirEscritura } from "../../../src/controladores/guarda";
import { usePerfil } from "../../../src/controladores/usePerfil";
import { useConexion } from "../../../src/controladores/useConexion";
import { Encabezado } from "../../../src/vistas/componentes/Encabezado";
import { useVoz } from "../../../src/controladores/useVoz";
import { useTema } from "../../../src/vistas/tema/useTema";
import { revisarTexto } from "../../../src/controladores/errores";

const MOTIVOS_VISTO_BUENO: { id: "trato_amable" | "buen_precio" | "confiable" | "viene_domicilio"; etiqueta: string; icono: string }[] = [
  { id: "trato_amable", etiqueta: "Trato amable", icono: "😊" },
  { id: "buen_precio", etiqueta: "Buen precio", icono: "💰" },
  { id: "confiable", etiqueta: "Confiable", icono: "🤝" },
  { id: "viene_domicilio", etiqueta: "Viene a domicilio", icono: "🏠" },
];

export default function PantallaVistoBueno() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));
  const { perfil } = usePerfil();
  const conexion = useConexion();

  const visto = useDarVistoBueno();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<"trato_amable" | "buen_precio" | "confiable" | "viene_domicilio" | null>(null);
  const [comentario, setComentario] = useState("");
  const [mostrarComentario, setMostrarComentario] = useState(false);
  const [errorComentario, setErrorComentario] = useState<string | null>(null);
  const vozComentario = useVoz((texto) => {
    setComentario((prev) => prev + (prev ? " " : "") + texto);
  });
  const [avisoEscritura, setAvisoEscritura] = useState<string | null>(null);

  const onVolver = useCallback(() => {
    if (paso === 1) {
      router.back();
    } else {
      setPaso((p) => (p === 3 ? 2 : 1));
    }
  }, [paso, router]);

  const irAPaso2 = useCallback(() => {
    if (!motivoSeleccionado) return;
    setPaso(2);
  }, [motivoSeleccionado]);

  const irAPaso3 = useCallback(() => {
    const invalido = revisarTexto(comentario, false);
    if (invalido) {
      setErrorComentario(invalido);
      return;
    }
    setErrorComentario(null);
    setPaso(3);
  }, [comentario]);

  const confirmar = useCallback(async () => {
    if (!motivoSeleccionado) return;
    setAvisoEscritura(null);
    const ok = await exigirEscritura({
      perfil,
      internetReal: conexion === "conectado",
      irAlRegistro: () => router.push("/registro/nombre"),
      avisar: (msg) => setAvisoEscritura(msg),
      ejecutar: async () => {
        await visto.enviar({
          servicioId: id,
          motivo: motivoSeleccionado,
          comentario: comentario.trim() || undefined,
          mostrarComentario,
        });
      },
    });
    if (ok && visto.listo) {
      router.back();
    }
  }, [id, motivoSeleccionado, comentario, mostrarComentario, perfil, conexion, router, visto]);

  const cancelar = useCallback(() => {
    router.back();
  }, [router]);

  // Mostrar aviso amarillo si no hay internet al intentar votar
  const sinInternet = conexion !== "conectado";

  if (paso === 1) {
    return (
      <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
        <Encabezado onVolver={onVolver} />
        <Text style={[estilos.titulo, { fontSize: tamano(22), color: tema.colores.texto }]}>¿Por qué lo recomiendas?</Text>
        <Text style={[estilos.subtitulo, { fontSize: tamano(16), color: tema.colores.textoSecundario }]}>Elige un motivo (obligatorio)</Text>
        <View style={estilos.motivosGrid}>
          {MOTIVOS_VISTO_BUENO.map((motivo) => (
            <Pressable
              key={motivo.id}
              onPress={() => setMotivoSeleccionado(motivo.id)}
              style={[
                estilos.motivoBtn,
                motivoSeleccionado === motivo.id ? { borderWidth: 3, borderColor: tema.colores.confirmado } : { borderWidth: 1, borderColor: tema.colores.textoSecundario },
                { backgroundColor: tema.colores.superficie },
              ]}
            >
              <Text style={[estilos.motivoIcono, { fontSize: tamano(32) }]}>{motivo.icono}</Text>
              <Text style={[estilos.motivoEtiqueta, { fontSize: tamano(18), color: tema.colores.texto, fontWeight: motivoSeleccionado === motivo.id ? "700" : "500" }]}>{motivo.etiqueta}</Text>
            </Pressable>
          ))}
        </View>
        {sinInternet && (
          <View style={estilos.avisoSinInternet}>
            <Text style={estilos.avisoSinInternetTexto}>Necesitas internet para votar.</Text>
          </View>
        )}
        <Pressable
          onPress={irAPaso2}
          disabled={!motivoSeleccionado || sinInternet}
          style={[estilos.botonContinuar, { backgroundColor: motivoSeleccionado && !sinInternet ? tema.colores.accion : tema.colores.textoSecundario }]}
        >
          <Text style={[estilos.botonContinuarTexto, { fontSize: tamano(20), color: tema.colores.fondo }]}>Continuar</Text>
        </Pressable>
        {avisoEscritura && (
          <Text style={[estilos.avisoEscritura, { fontSize: tamano(16), color: tema.colores.peligro, marginTop: 12, textAlign: "center" }]}>{avisoEscritura}</Text>
        )}
      </ScrollView>
    );
  }

  if (paso === 2) {
    return (
      <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
        <Encabezado onVolver={onVolver} />
        <Text style={[estilos.titulo, { fontSize: tamano(22), color: tema.colores.texto }]}>Comentario opcional</Text>
        <Text style={[estilos.subtitulo, { fontSize: tamano(16), color: tema.colores.textoSecundario }]}>Máximo 140 caracteres, sin enlaces</Text>

        <View style={estilos.comentarioWrapper}>
          <TextInput
            value={comentario}
            onChangeText={(texto) => {
              setComentario(texto);
              setErrorComentario(null);
            }}
            multiline={true}
            numberOfLines={4}
            placeholder="Tu experiencia..."
            style={[estilos.comentarioInput, { fontSize: tamano(18), color: tema.colores.texto, backgroundColor: tema.colores.superficie }]}
            maxLength={140}
          />
          <View style={estilos.contadorRow}>
            <Pressable onPress={() => vozComentario.alternar()} style={estilos.botonVozPequeno}>
              <Text style={[estilos.botonVozTexto, { fontSize: tamano(18), color: tema.colores.accion }]}>
                {vozComentario.escuchando ? "🎤 Te escucho" : "🎤 Hablar"}
              </Text>
            </Pressable>
            <Text style={[estilos.contador, { fontSize: tamano(16), color: comentario.length > 140 ? tema.colores.peligro : tema.colores.textoSecundario }]}>
              {comentario.length}/140
            </Text>
          </View>
        </View>

        {errorComentario && (
          <Text style={[estilos.errorTexto, { fontSize: tamano(16), color: tema.colores.peligro }]}>{errorComentario}</Text>
        )}

        {/* Casilla "Mostrar mi comentario con mi nombre corto" - columna mostrar_comentario existe en vistos_buenos (01_tablas.sql:92) */}
        <Pressable onPress={() => setMostrarComentario(!mostrarComentario)} style={estilos.checkboxWrapper}>
          <View style={[
            estilos.checkbox,
            mostrarComentario ? { backgroundColor: tema.colores.accion, borderColor: tema.colores.accion } : { borderColor: tema.colores.textoSecundario },
          ]}>
            {mostrarComentario && <Text style={estilos.checkboxCheck}>✓</Text>}
          </View>
          <Text style={[estilos.checkboxTexto, { fontSize: tamano(16), color: tema.colores.texto }]}>Mostrar mi comentario con mi nombre corto</Text>
        </Pressable>

        {sinInternet && (
          <View style={estilos.avisoSinInternet}>
            <Text style={estilos.avisoSinInternetTexto}>Necesitas internet para votar.</Text>
          </View>
        )}

        <Pressable
          onPress={irAPaso3}
          disabled={sinInternet}
          style={[estilos.botonContinuar, { backgroundColor: sinInternet ? tema.colores.textoSecundario : tema.colores.accion, marginTop: 16 }]}
        >
          <Text style={[estilos.botonContinuarTexto, { fontSize: tamano(20), color: tema.colores.fondo }]}>Continuar</Text>
        </Pressable>
        {avisoEscritura && (
          <Text style={[estilos.avisoEscritura, { fontSize: tamano(16), color: tema.colores.peligro, marginTop: 12, textAlign: "center" }]}>{avisoEscritura}</Text>
        )}
      </ScrollView>
    );
  }

  // Paso 3: Confirmación
  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={onVolver} />
   <Text style={[estilos.titulo, { fontSize: tamano(22), color: tema.colores.texto, textAlign: "center" }]}>¿Dar tu Visto Bueno?</Text>
      <Text style={[estilos.subtitulo, { fontSize: tamano(18), color: tema.colores.textoSecundario }, { textAlign: "center", marginTop: 8 }]}>
        {MOTIVOS_VISTO_BUENO.find((m) => m.id === motivoSeleccionado)?.etiqueta}
        {comentario.trim() && `\n\n"${comentario}"`}
        {mostrarComentario && "\n\nSe mostrará con tu nombre corto."}
      </Text>
      {sinInternet && (
        <View style={estilos.avisoSinInternet}>
          <Text style={estilos.avisoSinInternetTexto}>Necesitas internet para votar.</Text>
        </View>
      )}
      <View style={estilos.botonesFinales}>
        <Pressable onPress={cancelar} style={[estilos.botonCancelar, { backgroundColor: tema.colores.superficie, borderWidth: 1, borderColor: tema.colores.textoSecundario }]}>
          <Text style={[estilos.botonCancelarTexto, { fontSize: tamano(20), color: tema.colores.texto }]}>No</Text>
        </Pressable>
        <Pressable
          onPress={confirmar}
          disabled={visto.enviando || sinInternet}
          style={[estilos.botonConfirmar, { backgroundColor: visto.enviando || sinInternet ? tema.colores.textoSecundario : tema.colores.confirmado }]}
        >
          <Text style={[estilos.botonConfirmarTexto, { fontSize: tamano(20), color: tema.colores.fondo }]}>{visto.enviando ? "Enviando…" : "Sí"}</Text>
        </Pressable>
      </View>
      {visto.error && (
        <Text style={[estilos.errorToast, { fontSize: tamano(16), color: tema.colores.peligro, marginTop: 16, textAlign: "center" }]}>{visto.error}</Text>
      )}
      {avisoEscritura && (
        <Text style={[estilos.avisoEscritura, { fontSize: tamano(16), color: tema.colores.peligro, marginTop: 12, textAlign: "center" }]}>{avisoEscritura}</Text>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 16, padding: 16, paddingBottom: 32 },
  titulo: { fontWeight: "700", textAlign: "center" },
  subtitulo: { textAlign: "center" },
  motivosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 16 },
  motivoBtn: {
    width: "45%",
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
  },
  motivoIcono: {},
  motivoEtiqueta: { textAlign: "center" },
  botonContinuar: { minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 24, paddingHorizontal: 24 },
  botonContinuarTexto: { fontWeight: "700" },
  comentarioWrapper: { gap: 8, marginTop: 16 },
  comentarioInput: { minHeight: 120, borderRadius: 12, padding: 12, textAlignVertical: "top" },
  contadorRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  contador: { fontWeight: "500" },
  botonVozPequeno: { paddingVertical: 8, paddingHorizontal: 12 },
  botonVozTexto: { fontWeight: "700" },
  errorTexto: { marginTop: 8 },
  checkboxWrapper: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, minHeight: 52 },
  checkbox: { width: 44, height: 44, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkboxCheck: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  checkboxTexto: { flex: 1, fontSize: 18 },
  avisoSinInternet: { backgroundColor: "#FFF1C2", borderRadius: 8, padding: 12, marginTop: 16 },
  avisoSinInternetTexto: { fontSize: 18, fontWeight: "500", color: "#3D2E00", textAlign: "center" },
  botonesFinales: { flexDirection: "row", gap: 12, marginTop: 24 },
  botonCancelar: { flex: 1, minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  botonCancelarTexto: { fontWeight: "700" },
  botonConfirmar: { flex: 1, minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  botonConfirmarTexto: { fontWeight: "700" },
  errorToast: { textAlign: "center" },
  avisoEscritura: { textAlign: "center" },
});