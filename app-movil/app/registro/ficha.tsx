import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BarraRegistro } from "../../src/vistas/componentes/BarraRegistro";
import { Boton } from "../../src/vistas/componentes/Boton";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useRegistro } from "../../src/controladores/useRegistro";

const OPCIONES = ["Vivo solo/a", "Me cuesta caminar", "Veo poco", "Oigo poco", "Tomo medicinas"];

export default function RegistroFicha() {
  const registro = useRegistro();
  const voz = useEscuchar();
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [acepta, setAcepta] = useState<boolean | null>(null);
  const guardar = async () => {
    await registro.guardarFicha({
      contactos: [],
      mensaje: seleccionadas.join(", "),
      consentimiento: acepta === true ? { aceptado: true, fecha: new Date().toISOString() } : { aceptado: false, fecha: new Date().toISOString() },
    });
    await registro.finalizar();
    router.replace("/inicio");
  };
  const alternar = (opcion: string) => {
    setSeleccionadas((actuales) => actuales.includes(opcion) ? actuales.filter((item) => item !== opcion) : [...actuales, opcion]);
  };
  return (
    <View style={estilos.pagina}>
      <BarraRegistro pregunta={4} texto="Completa tu ficha" escuchar={() => void voz.escuchar("Completa tu ficha")} />
      {OPCIONES.map((opcion) => (
        <Pressable key={opcion} onPress={() => opcion === "Ninguna" ? setSeleccionadas([]) : alternar(opcion)} style={estilos.casilla}>
          <Text style={estilos.texto}>{seleccionadas.includes(opcion) ? "☑" : "☐"} {opcion}</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => setSeleccionadas([])} style={estilos.casilla}><Text style={estilos.texto}>☐ Ninguna</Text></Pressable>
      <Text style={estilos.texto}>Mi ficha solo la verán mi familia y mi brigada si pido ayuda.</Text>
      <View style={estilos.fila}>
        <Boton variante={acepta === true ? "confirmar" : "secundario"} onPress={() => setAcepta(true)}>Sí, acepto</Boton>
        <Boton variante={acepta === false ? "confirmar" : "secundario"} onPress={() => setAcepta(false)}>No, gracias</Boton>
      </View>
      <Boton onPress={() => void guardar()}>Terminar</Boton>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 12, padding: 16 },
  casilla: { minHeight: 52, justifyContent: "center", padding: 12, borderRadius: 10, backgroundColor: "#F4F1EA" },
  texto: { fontSize: 18, lineHeight: 26 },
  fila: { flexDirection: "row", gap: 8 },
});
