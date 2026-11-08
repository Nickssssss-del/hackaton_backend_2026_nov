import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Aviso } from "../../src/vistas/componentes/Aviso";
import { Boton } from "../../src/vistas/componentes/Boton";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { useEmergencia } from "../../src/controladores/useEmergencia";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useTema } from "../../src/vistas/tema/useTema";

export default function EmergenciaAviso() {
  const { tema } = useTema();
  const emergencia = useEmergencia();
  const voz = useEscuchar();
  const params = useLocalSearchParams<{ mensaje?: string; telefonos?: string }>();
  const [confirmando, setConfirmando] = useState(false);
  const mensaje = typeof params.mensaje === "string" ? params.mensaje : emergencia.mensaje ?? "";
  const telefonos = typeof params.telefonos === "string" ? params.telefonos.split(",").filter(Boolean) : emergencia.telefonosAviso;
  const principal = emergencia.contactos[0];
  const salir = () => {
    voz.silenciar();
    router.replace("/emergencia");
  };
  const abrirOtraVez = async () => {
    const resultado = await emergencia.necesitoAyuda();
    if (resultado.estado === "mensaje_listo") {
      router.setParams({ mensaje: resultado.mensaje, telefonos: resultado.telefonos.join(",") });
    }
  };
  const estoyBien = async () => {
    const resultado = await emergencia.estoyBien();
    if (resultado.estado === "mensaje_listo") {
      router.setParams({ mensaje: resultado.mensaje, telefonos: resultado.telefonos.join(",") });
    }
    setConfirmando(false);
  };
  return (
    <View style={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={salir} />
      <Aviso tipo="amarillo">Tu mensaje está listo: toca Enviar en Mensajes</Aviso>
      <Text selectable style={[estilos.etiqueta, { color: tema.colores.texto }]}>Texto del SMS</Text>
      <Text selectable style={[estilos.mensaje, { color: tema.colores.texto, backgroundColor: tema.colores.superficie }]}>
        {mensaje}
      </Text>
      <Text style={[estilos.para, { color: tema.colores.textoSecundario }]}>
        Para: {telefonos.join(", ")}
      </Text>
      <Boton onPress={() => void abrirOtraVez()}>Abrir el mensaje otra vez</Boton>
      {principal ? (
        <Boton onPress={() => void emergencia.llamar(principal.telefono)} variante="secundario">
          {`Llamar a ${principal.nombre}`}
        </Boton>
      ) : null}
      {!confirmando ? (
        <Boton onPress={() => setConfirmando(true)} variante="secundario">Estoy bien</Boton>
      ) : (
        <View style={estilos.confirmacion}>
          <Text style={[estilos.para, { color: tema.colores.texto }]}>¿Quieres abrir el mensaje “Ya estoy bien”?</Text>
          <View style={estilos.fila}>
            <Boton onPress={() => void estoyBien()} variante="confirmar">Sí</Boton>
            <Boton onPress={() => setConfirmando(false)} variante="secundario">No</Boton>
          </View>
        </View>
      )}
      {emergencia.aviso && !emergencia.aviso.includes("Tu mensaje está listo") ? (
        <Aviso tipo="amarillo">{emergencia.aviso}</Aviso>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 14, padding: 16 },
  etiqueta: { fontSize: 20, fontWeight: "700" },
  mensaje: { minHeight: 120, padding: 14, borderRadius: 10, fontSize: 18 },
  para: { fontSize: 18 },
  fila: { flexDirection: "row", gap: 8 },
  confirmacion: { gap: 12 },
});
