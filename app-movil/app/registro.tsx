/**
 * Vista. La cuenta ya es anónima. Nombre, zona y celular son opcionales.
 */
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useRegistro } from "../src/controladores/useRegistro";
import { useVoz } from "../src/controladores/useVoz";
import { BotonVoz } from "../src/vistas/BotonVoz";

export default function PantallaRegistro() {
  const registro = useRegistro();
  const [nombre, setNombre] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [celular, setCelular] = useState("");
  const voz = useVoz(setNombre);

  useEffect(() => {
    if (!registro.perfil) return;
    setNombre(registro.perfil.nombre ?? "");
    setZonaId(registro.perfil.zonaId ?? "");
    setCelular(registro.perfil.celular ?? "");
  }, [registro.perfil]);

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text>Puedes usar la app sin celular ni correo.</Text>
      {!registro.listo ? <Text>Preparando la sesión…</Text> : null}
      {registro.error ? <Text>{registro.error}</Text> : null}
      <BotonVoz escuchando={voz.escuchando} onPulsar={() => void voz.alternar()} />
      {voz.teclado ? (
        <TextInput value={nombre} onChangeText={setNombre} placeholder="Escribe tu nombre" style={estilos.teclado} />
      ) : null}
      <TextInput value={nombre} onChangeText={setNombre} placeholder="Nombre" style={estilos.campo} />
      <TextInput
        value={celular}
        onChangeText={setCelular}
        placeholder="Celular de 9 dígitos, empieza en 9"
        style={estilos.campo}
      />
      {registro.zonas.map((zona) => (
        <Pressable key={zona.id} onPress={() => setZonaId(zona.id)} style={estilos.campo}>
          <Text>{zona.id === zonaId ? `· ${zona.nombre}` : `${zona.nombre} (${zona.distrito})`}</Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        disabled={registro.enviando}
        onPress={() => void registro.guardar({ nombre: nombre.trim(), zonaId: zonaId.trim(), celular: celular.trim() })}
        style={estilos.boton}
      >
        <Text style={estilos.botonTexto}>Guardar mis datos</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={registro.enviando}
        onPress={() => void registro.borrar()}
        style={estilos.boton}
      >
        <Text style={estilos.botonTexto}>Borrar mis datos</Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: {
    gap: 12,
    padding: 16,
  },
  teclado: { minHeight: 72, fontSize: 28, borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#f4f1ea" },
  campo: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f4f1ea",
  },
  boton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f4b3a",
  },
  botonTexto: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
