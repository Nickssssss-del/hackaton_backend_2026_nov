import * as Contacts from "expo-contacts";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { BarraRegistro } from "../../src/vistas/componentes/BarraRegistro";
import { Boton } from "../../src/vistas/componentes/Boton";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useGruposCercanos } from "../../src/controladores/useGruposCercanos";
import { useRegistro } from "../../src/controladores/useRegistro";
import type { ContactoLocal } from "../../src/modelos/tipos";

export default function RegistroContactos() {
  const registro = useRegistro();
  const voz = useEscuchar();
  const grupos = useGruposCercanos();
  const params = useLocalSearchParams<{ manual?: string }>();
  const [manual, setManual] = useState(params.manual === "1");
  const [contactos, setContactos] = useState<ContactoLocal[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [agenda, setAgenda] = useState<Contacts.ExistingContact[]>([]);

  useEffect(() => {
    if (manual) return;
    void Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers] })
      .then((resultado) => setAgenda(resultado.data));
  }, [manual]);

  const agregar = (nombre: string, telefono: string) => {
    if (contactos.length >= 2) return;
    setContactos((actuales) => [...actuales, { nombre, telefono, relacion: "", orden: actuales.length + 1 }]);
  };
  const cambiarRelacion = (indice: number, relacion: string) => {
    setContactos((actuales) => actuales.map((contacto, i) => i === indice ? { ...contacto, relacion } : contacto));
  };
  const guardar = async () => {
    if (contactos.length !== 2 || contactos.some((contacto) => !contacto.telefono || !contacto.relacion)) return;
    await registro.guardarContactos(contactos);
    await registro.finalizar();
    router.replace("/registro/ficha");
  };
  const filtrados = agenda.filter((contacto) => (contacto.name ?? "").toLowerCase().includes(busqueda.toLowerCase()));
  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <BarraRegistro pregunta={4} texto="Elige dos personas de confianza" escuchar={() => void voz.escuchar("Elige dos personas de confianza")} />
      {!manual ? <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="Buscar en tus contactos" style={estilos.campo} /> : null}
      {!manual ? filtrados.slice(0, 20).map((contacto) => {
        const telefono = contacto.phoneNumbers?.[0]?.number;
        return telefono ? <Pressable key={contacto.id} onPress={() => agregar(contacto.name ?? "Contacto", telefono)} style={estilos.opcion}><Text style={estilos.texto}>{contacto.name} · {telefono}</Text></Pressable> : null;
      }) : null}
      {manual ? [0, 1].map((indice) => (
        <TextInput
          key={indice}
          keyboardType="number-pad"
          maxLength={9}
          placeholder={`Número ${indice + 1}`}
          value={contactos[indice]?.telefono ?? ""}
          onChangeText={(telefono) => setContactos((actuales) => {
            const copia = [...actuales];
            copia[indice] = { nombre: `Contacto ${indice + 1}`, telefono: telefono.replace(/\D/g, ""), relacion: copia[indice]?.relacion ?? "", orden: indice + 1 };
            return copia;
          })}
          style={estilos.campo}
        />
      )) : null}
      {contactos.map((contacto, indice) => (
        <ScrollView horizontal key={`${contacto.telefono}-${indice}`} contentContainerStyle={estilos.relaciones}>
          <Text style={estilos.texto}>{contacto.nombre}</Text>
          {["Hija", "Hijo", "Vecino/a", "Otro"].map((relacion) => (
            <Boton key={relacion} variante={contacto.relacion === relacion ? "confirmar" : "secundario"} onPress={() => cambiarRelacion(indice, relacion)}>{relacion}</Boton>
          ))}
        </ScrollView>
      ))}
      {grupos.find((grupo) => grupo.tipo === "brigada") ? <Text style={estilos.texto}>Tu brigada verificada será tu tercer contacto.</Text> : null}
      <Text style={estilos.texto}>Listo · elegiste {contactos.length} de 2</Text>
      <Boton disabled={contactos.length !== 2 || contactos.some((contacto) => !contacto.relacion)} onPress={() => void guardar()}>Listo</Boton>
      <Boton variante="secundario" onPress={() => setManual(!manual)}>{manual ? "Elegir de la agenda" : "Escribir los números"}</Boton>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 14, padding: 16 },
  campo: { minHeight: 58, fontSize: 22, borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#F4F1EA" },
  opcion: { minHeight: 52, justifyContent: "center", padding: 12, borderRadius: 10, backgroundColor: "#F4F1EA" },
  texto: { fontSize: 18 },
  relaciones: { gap: 8, alignItems: "center" },
});
