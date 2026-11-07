/**
 * Vista. Contactos de emergencia guardados en el teléfono.
 */
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useEmergencia } from "../src/controladores/useEmergencia";
import { useGruposCercanos } from "../src/controladores/useGruposCercanos";
import { BotonEmergencia } from "../src/vistas/BotonEmergencia";

export default function PantallaEmergencia() {
  const emergencia = useEmergencia();
  const grupos = useGruposCercanos();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");

  const agregar = () => {
    const actual = emergencia.ficha ?? { contactos: [], mensaje };
    void emergencia.guardar({
      mensaje: mensaje || actual.mensaje,
      contactos: [...actual.contactos, { nombre: nombre.trim(), telefono: telefono.trim() }],
    });
    setNombre("");
    setTelefono("");
  };

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <BotonEmergencia onPulsar={() => void emergencia.avisar()} />
      <Pressable onPress={emergencia.escuchar} style={estilos.guardar}>
        <Text style={estilos.guardarTexto}>Escuchar qué hacer</Text>
      </Pressable>
      <Pressable onPress={() => void emergencia.hayPeligro()} style={estilos.guardar}>
        <Text style={estilos.guardarTexto}>Hay peligro aquí</Text>
      </Pressable>
      {emergencia.aviso ? <Text>{emergencia.aviso}</Text> : null}
      {emergencia.punto ? <Text>{emergencia.punto}</Text> : null}
      {emergencia.error ? <Text>{emergencia.error}</Text> : null}
      <Pressable onPress={() => void emergencia.elegirContacto()} style={estilos.guardar}>
        <Text style={estilos.guardarTexto}>Elegir de mis contactos</Text>
      </Pressable>
      {(emergencia.ficha?.contactos ?? []).map((contacto) => (
        <Pressable key={`${contacto.nombre}-${contacto.telefono}`} onPress={() => void emergencia.quitarContacto(contacto.telefono)}>
          <Text>
            {contacto.nombre} · {contacto.telefono} · Quitar
          </Text>
        </Pressable>
      ))}
      {grupos.length > 0 ? <Text>Grupos de apoyo</Text> : null}
      {grupos.map((grupo) => (
        <Pressable
          key={grupo.id}
          onPress={() => {
            if (grupo.contacto) void Linking.openURL(`tel:${grupo.contacto.replace(/[^\d+]/g, "")}`);
          }}
        >
          <Text>
            {grupo.nombre}
            {grupo.minutos ? ` · ≈ ${grupo.minutos} min a pie` : ""}
            {grupo.verificada ? " · Verificado" : ""}
          </Text>
        </Pressable>
      ))}
      <TextInput value={nombre} onChangeText={setNombre} placeholder="Nombre" style={estilos.campo} />
      <TextInput value={telefono} onChangeText={setTelefono} placeholder="Teléfono" style={estilos.campo} />
      <TextInput
        value={mensaje}
        onChangeText={setMensaje}
        maxLength={140}
        placeholder="Mensaje breve, sin enlaces"
        style={estilos.campo}
      />
      <Pressable accessibilityRole="button" onPress={agregar} style={estilos.guardar}>
        <Text style={estilos.guardarTexto}>Guardar contacto</Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: {
    gap: 12,
    padding: 16,
  },
  campo: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f4f1ea",
  },
  guardar: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f4b3a",
  },
  guardarTexto: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
