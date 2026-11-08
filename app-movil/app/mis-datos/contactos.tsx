/**
 * Vista. Editar contactos de emergencia (máx. 2).
 * Reutiliza la lógica del registro: agenda o escribir.
 * Guarda en local/contactos (nunca en Supabase).
 */
import * as Contacts from "expo-contacts/legacy";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { Boton } from "../../src/vistas/componentes/Boton";
import { Aviso } from "../../src/vistas/componentes/Aviso";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useGruposCercanos } from "../../src/controladores/useGruposCercanos";
import { leerContactosLocales, guardarContactosLocales, contactoLocalDesdeTelefono } from "../../src/modelos/local/contactos";
import type { ContactoLocal } from "../../src/modelos/tipos";

const MAX_CONTACTOS = 2;

export default function PantallaMisDatosContactos() {
  const voz = useEscuchar();
  const grupos = useGruposCercanos();
  const params = useLocalSearchParams<{ manual?: string }>();
  const [manual, setManual] = useState(params.manual === "1");
  const [contactos, setContactos] = useState<ContactoLocal[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [agenda, setAgenda] = useState<Contacts.ExistingContact[]>([]);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    let activo = true;
    leerContactosLocales().then((c) => {
      if (activo) setContactos(c);
    });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (manual) return;
    Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers] })
      .then((resultado) => setAgenda(resultado.data));
  }, [manual]);

  const agregar = (nombre: string, telefono: string) => {
    if (contactos.length >= MAX_CONTACTOS) return;
    setContactos((actuales) => [...actuales, { nombre, telefono, relacion: "", orden: actuales.length + 1 }]);
  };

  const cambiarRelacion = (indice: number, relacion: string) => {
    setContactos((actuales) => actuales.map((contacto, i) => i === indice ? { ...contacto, relacion } : contacto));
  };

  const eliminar = (indice: number) => {
    setContactos((actuales) => actuales.filter((_, i) => i !== indice).map((c, idx) => ({ ...c, orden: idx + 1 })));
  };

  const guardar = async () => {
    if (contactos.length !== MAX_CONTACTOS || contactos.some((c) => !c.telefono || !c.relacion)) return;
    await guardarContactosLocales(contactos);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  };

  const filtrados = agenda.filter((contacto) =>
    (contacto.name ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const brigada = grupos.find((g) => g.tipo === "brigada");

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Encabezado
        onVolver={() => router.back()}
        escuchar={() => void voz.escuchar("Elige dos personas de confianza")}
      />
      <Aviso tipo="azul">Estos contactos solo están en tu teléfono. La app no los sube a la nube.</Aviso>

      {!manual ? (
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar en tus contactos"
          style={estilos.campo}
        />
      ) : null}

      {!manual ? (
        filtrados.slice(0, 20).map((contacto) => {
          const telefono = contacto.phoneNumbers?.[0]?.number;
          return telefono ? (
            <Pressable key={contacto.id} onPress={() => agregar(contacto.name ?? "Contacto", telefono)} style={estilos.opcion}>
              <Text style={estilos.texto}>{contacto.name} · {telefono}</Text>
            </Pressable>
          ) : null;
        })
      ) : (
        [0, 1].map((indice) => (
          <TextInput
            key={indice}
            keyboardType="number-pad"
            maxLength={9}
            placeholder={`Número ${indice + 1}`}
            value={contactos[indice]?.telefono ?? ""}
            onChangeText={(telefono) =>
              setContactos((actuales) => {
                const copia = [...actuales];
                copia[indice] = {
                  nombre: `Contacto ${indice + 1}`,
                  telefono: telefono.replace(/\D/g, ""),
                  relacion: copia[indice]?.relacion ?? "",
                  orden: indice + 1,
                };
                return copia;
              })
            }
            style={estilos.campo}
          />
        ))
      )}

      {contactos.map((contacto, indice) => (
        <View key={`${contacto.telefono}-${indice}`} style={estilos.contacto}>
          <View style={estilos.contactoInfo}>
            <Text style={estilos.texto}>{contacto.nombre}</Text>
            <Text style={estilos.subtexto}>{contacto.telefono}</Text>
          </View>
          <ScrollView horizontal contentContainerStyle={estilos.relaciones}>
            {["Hija", "Hijo", "Vecino/a", "Otro"].map((relacion) => (
              <Boton
                key={relacion}
                variante={contacto.relacion === relacion ? "confirmar" : "secundario"}
                onPress={() => cambiarRelacion(indice, relacion)}
                style={{ minWidth: 80 }}
              >
                {relacion}
              </Boton>
            ))}
          </ScrollView>
          <Pressable onPress={() => eliminar(indice)} style={estilos.botonEliminar}>
            <Text style={estilos.textoEliminar}>Eliminar</Text>
          </Pressable>
        </View>
      ))}

      {brigada ? (
        <View style={estilos.brigada}>
          <Text style={estilos.texto}>Tu brigada verificada será tu tercer contacto:</Text>
          <Text style={estilos.textoBrigada}>{brigada.nombre} · {brigada.contacto || "sin teléfono"}</Text>
        </View>
      ) : null}

      <Text style={estilos.contador}>Listo · elegiste {contactos.length} de {MAX_CONTACTOS}</Text>

      <Boton disabled={contactos.length !== MAX_CONTACTOS || contactos.some((c) => !c.relacion)} onPress={() => void guardar()}>
        {guardado ? "Guardado" : "Guardar"}
      </Boton>

      <Boton variante="secundario" onPress={() => setManual(!manual)}>
        {manual ? "Elegir de la agenda" : "Escribir los números"}
      </Boton>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flexGrow: 1, gap: 14, padding: 16 },
  campo: { minHeight: 52, fontSize: 18, borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#F4F1EA" },
  opcion: { minHeight: 52, justifyContent: "center", padding: 12, borderRadius: 10, backgroundColor: "#F4F1EA" },
  texto: { fontSize: 18 },
  contacto: { gap: 8, padding: 12, borderRadius: 10, backgroundColor: "#F4F1EA" },
  contactoInfo: { gap: 2 },
  subtexto: { fontSize: 18, color: "#4A4A4A" },
  relaciones: { gap: 8, alignItems: "center" },
  botonEliminar: { alignSelf: "flex-start", marginTop: 4 },
  textoEliminar: { fontSize: 18, color: "#D91023", fontWeight: "600" },
  brigada: { padding: 12, borderRadius: 10, backgroundColor: "#E5EEFC", gap: 4 },
  textoBrigada: { fontSize: 18, fontWeight: "600" },
  contador: { fontSize: 18, textAlign: "center", color: "#4A4A4A" },
});