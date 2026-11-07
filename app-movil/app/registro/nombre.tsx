import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BarraRegistro } from "../../src/vistas/componentes/BarraRegistro";
import { Boton } from "../../src/vistas/componentes/Boton";
import { BotonVoz } from "../../src/vistas/componentes/BotonVoz";
import { CampoTexto } from "../../src/vistas/componentes/CampoTexto";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useRegistro } from "../../src/controladores/useRegistro";
import { useVoz } from "../../src/controladores/useVoz";

export default function RegistroNombre() {
  const registro = useRegistro();
  const voz = useVoz((texto) => setNombre(texto.slice(0, 60)));
  const escuchar = useEscuchar();
  const [nombre, setNombre] = useState(registro.perfil?.nombre ?? "");
  const [confirmado, setConfirmado] = useState(false);
  const valido = nombre.trim().length >= 2 && nombre.trim().length <= 60;
  const siguiente = async () => {
    if (!valido) return;
    await registro.guardarPaso({ nombre: nombre.trim() });
    router.push("/registro/celular");
  };
  return (
    <View style={estilos.pagina}>
      <BarraRegistro pregunta={1} texto="¿Cómo te llamas?" escuchar={() => void escuchar.escuchar("¿Cómo te llamas?")} />
      <BotonVoz escuchando={voz.escuchando} onPulsar={() => void voz.alternar()} />
      {voz.teclado ? <CampoTexto autoFocus value={nombre} onChangeText={setNombre} placeholder="Escribe tu nombre" maxLength={60} /> : null}
      {nombre ? <Text style={estilos.escuchado}>Te escuchamos: {nombre}</Text> : null}
      {nombre ? (
        <View style={estilos.fila}>
          <Boton onPress={() => setConfirmado(true)}>Sí, está bien</Boton>
          <Boton variante="secundario" onPress={() => setNombre("")}>Repetir</Boton>
          <Boton variante="secundario" onPress={() => setConfirmado(false)}>Escribir</Boton>
        </View>
      ) : null}
      <Boton disabled={!valido || !confirmado} onPress={() => void siguiente()}>Continuar</Boton>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 14, padding: 16 },
  escuchado: { fontSize: 20 },
  fila: { gap: 10 },
});
