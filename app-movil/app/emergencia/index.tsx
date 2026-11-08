import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Aviso } from "../../src/vistas/componentes/Aviso";
import { Boton } from "../../src/vistas/componentes/Boton";
import { BotonEmergencia } from "../../src/vistas/componentes/BotonEmergencia";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { useEmergencia } from "../../src/controladores/useEmergencia";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useTema } from "../../src/vistas/tema/useTema";

const TEXTOS = {
  titulo: "Emergencia",
  ayuda: "Necesito ayuda",
  ayudaSubtitulo: "Prepara tu aviso con tu ubicación",
  escuchar: "Escuchar qué hacer",
  peligro: "Hay peligro aquí",
  personas: "Mis personas de confianza y mi brigada",
};

export default function EmergenciaInicio() {
  const { tema, salirEmergencia } = useTema();
  const emergencia = useEmergencia();
  const voz = useEscuchar();
  const salir = () => {
    voz.silenciar();
    salirEmergencia();
    router.replace("/");
  };
  const ayuda = async () => {
    const resultado = await emergencia.necesitoAyuda();
    if (resultado.estado === "pedir_numero") {
      router.push("/emergencia/numero");
      return;
    }
    router.push({
      pathname: "/emergencia/aviso",
      params: { mensaje: resultado.mensaje, telefonos: resultado.telefonos.join(",") },
    });
  };
  const instrucciones = emergencia.instrucciones.join(". ");

  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <View style={[estilos.encabezado, { backgroundColor: tema.colores.peligro }]}>
        <Pressable onPress={salir} style={estilos.salir}>
          <Text style={[estilos.encabezadoTexto, { color: tema.colores.fondo }]}>Salir</Text>
        </Pressable>
        <Text style={[estilos.titulo, { color: tema.colores.fondo }]}>{TEXTOS.titulo}</Text>
      </View>
      <BotonEmergencia onPulsar={() => void ayuda()} />
      <Text style={[estilos.subtitulo, { color: tema.colores.textoSecundario }]}>{TEXTOS.ayudaSubtitulo}</Text>
      <Boton onPress={() => void ayuda()} variante="peligro">{TEXTOS.ayuda}</Boton>
      <Boton onPress={() => void voz.escuchar(instrucciones, true)}>{TEXTOS.escuchar}</Boton>
      <View style={estilos.fila}>
        <Boton onPress={() => voz.silenciar()} variante="secundario">Silenciar</Boton>
        <Boton onPress={() => void voz.repetir(instrucciones)} variante="secundario">Repetir</Boton>
      </View>
      <Text style={[estilos.estado, { color: tema.colores.textoSecundario }]}>
        Por validar
      </Text>
      {voz.aviso ? <Aviso tipo="amarillo">{voz.aviso}</Aviso> : null}
      <Boton onPress={() => router.push("/emergencia/peligro")} variante="secundario">{TEXTOS.peligro}</Boton>
      <Text style={[estilos.seccion, { color: tema.colores.texto }]}>{TEXTOS.personas}</Text>
      {emergencia.contactos.map((contacto, indice) => (
        <View key={`${contacto.telefono}-${contacto.orden}`} style={estilos.contacto}>
          <Text style={[estilos.contactoTexto, { color: tema.colores.texto }]}>
            {indice === 0 ? "Contacto principal" : contacto.nombre}
          </Text>
          <Pressable onPress={() => void emergencia.llamar(contacto.telefono)} style={estilos.llamar}>
            <Text style={[estilos.llamarTexto, { color: tema.colores.accion }]}>Llamar</Text>
          </Pressable>
        </View>
      ))}
      {emergencia.brigada ? (
        <View style={estilos.contacto}>
          <Text style={[estilos.contactoTexto, { color: tema.colores.texto }]}>{emergencia.brigada.nombre}</Text>
          {emergencia.brigada.contacto ? (
            <Pressable onPress={() => void emergencia.llamar(emergencia.brigada?.contacto ?? "")} style={estilos.llamar}>
              <Text style={[estilos.llamarTexto, { color: tema.colores.accion }]}>Llamar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={[estilos.pie, { backgroundColor: tema.colores.peligro }]}>
        <Text style={[estilos.en, { color: tema.colores.fondo }]}>Estás en: {emergencia.estasEn}</Text>
        {emergencia.numeros.map((numero) => (
          <Pressable key={numero.telefono} onPress={() => void emergencia.llamar(numero.telefono)} style={estilos.numero}>
            <Text style={[estilos.numeroTexto, { color: tema.colores.fondo }]}>
              {numero.telefono} {numero.nombre}
            </Text>
          </Pressable>
        ))}
        <Text style={[estilos.verificado, { color: tema.colores.fondo }]}>
          Números verificados el {emergencia.verificadoEl}
        </Text>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 12, padding: 16 },
  encabezado: { minHeight: 64, padding: 12, borderRadius: 12, gap: 4 },
  salir: { minHeight: 52, justifyContent: "center" },
  encabezadoTexto: { fontSize: 18, fontWeight: "700" },
  titulo: { fontSize: 28, fontWeight: "700" },
  subtitulo: { fontSize: 18 },
  fila: { flexDirection: "row", gap: 8 },
  estado: { fontSize: 18 },
  seccion: { fontSize: 22, fontWeight: "700", marginTop: 8 },
  contacto: { minHeight: 52, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  contactoTexto: { fontSize: 18 },
  llamar: { minHeight: 52, justifyContent: "center", paddingHorizontal: 12 },
  llamarTexto: { fontSize: 18, fontWeight: "700" },
  pie: { gap: 8, padding: 14, marginTop: 8, borderRadius: 12 },
  en: { fontSize: 18, fontWeight: "700" },
  numero: { minHeight: 52, justifyContent: "center" },
  numeroTexto: { fontSize: 18, fontWeight: "700" },
  verificado: { fontSize: 18 },
});
