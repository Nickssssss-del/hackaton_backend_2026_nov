import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BarraRegistro } from "../../src/vistas/componentes/BarraRegistro";
import { Boton } from "../../src/vistas/componentes/Boton";
import { CampoTexto } from "../../src/vistas/componentes/CampoTexto";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useRegistro } from "../../src/controladores/useRegistro";

export default function RegistroCelular() {
  const registro = useRegistro();
  const escuchar = useEscuchar();
  const [celular, setCelular] = useState(registro.perfil?.celular ?? "");
  const valido = /^9\d{8}$/.test(celular);
  const siguiente = async () => {
    if (!valido) return;
    await registro.guardarPaso({ celular });
    router.push("/registro/zona");
  };
  return (
    <View style={estilos.pagina}>
      <BarraRegistro pregunta={2} texto="¿Cuál es tu celular?" escuchar={() => void escuchar.escuchar("Escribe tu celular de 9 dígitos", true)} />
      <Text style={estilos.ayuda}>Escribe exactamente 9 dígitos y empieza en 9.</Text>
      <CampoTexto
        autoFocus
        keyboardType="number-pad"
        value={celular}
        onChangeText={(valor) => setCelular(valor.replace(/\D/g, "").slice(0, 9))}
        placeholder="9 dígitos"
        maxLength={9}
      />
      {!valido && celular.length > 0 ? <Text style={estilos.aviso}>El celular debe tener 9 dígitos y empezar en 9.</Text> : null}
      <Boton disabled={!valido} onPress={() => void siguiente()}>Continuar</Boton>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 14, padding: 16 },
  ayuda: { fontSize: 18 },
  aviso: { fontSize: 18, color: "#3D2E00" },
});
