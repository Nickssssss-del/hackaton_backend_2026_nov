import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Boton } from "../../src/vistas/componentes/Boton";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { useEmergencia } from "../../src/controladores/useEmergencia";
import { useTema } from "../../src/vistas/tema/useTema";

export default function EmergenciaNumero() {
  const { tema } = useTema();
  const emergencia = useEmergencia();
  const [telefono, setTelefono] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const guardar = async () => {
    const guardado = await emergencia.guardarNumeroRapido(telefono);
    if (!guardado) {
      setAviso("Escribe un celular de 9 dígitos que empiece en 9.");
      return;
    }
    router.replace("/emergencia");
  };
  return (
    <View style={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={() => router.replace("/emergencia")} />
      <Text style={[estilos.titulo, { color: tema.colores.texto }]}>Agrega un número de confianza</Text>
      <TextInput
        autoFocus
        keyboardType="number-pad"
        maxLength={9}
        value={telefono}
        onChangeText={(valor) => setTelefono(valor.replace(/\D/g, ""))}
        placeholder="9 dígitos"
        style={[estilos.campo, { color: tema.colores.texto, backgroundColor: tema.colores.superficie }]}
      />
      {aviso ? <Text style={[estilos.aviso, { color: tema.colores.textoSecundario }]}>{aviso}</Text> : null}
      <Boton onPress={() => void guardar()}>Guardar y preparar aviso</Boton>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 16, padding: 16 },
  titulo: { fontSize: 24, fontWeight: "700" },
  campo: { minHeight: 64, borderRadius: 12, paddingHorizontal: 16, fontSize: 28, letterSpacing: 4 },
  aviso: { fontSize: 18 },
});
