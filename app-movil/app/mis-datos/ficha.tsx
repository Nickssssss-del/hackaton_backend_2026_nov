/**
 * Vista. Editar ficha de emergencia y consentimiento.
 * Mismas casillas que el registro; "Ninguna" desmarca las demás.
 * "Retirar consentimiento" pone aceptado: false.
 * Guarda en barrio.ficha con la MISMA forma que lee useEmergencia.
 */
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { Boton } from "../../src/vistas/componentes/Boton";
import { Aviso } from "../../src/vistas/componentes/Aviso";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { leerFicha, guardarFicha, guardarConsentimiento } from "../../src/modelos/local/ficha";

const OPCIONES = ["Vivo solo/a", "Me cuesta caminar", "Veo poco", "Oigo poco", "Tomo medicinas"];

export default function PantallaMisDatosFicha() {
  const voz = useEscuchar();
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [acepta, setAcepta] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardado, setGuardado] = useState(false);

  // Cargar ficha existente
  useState(() => {
    leerFicha().then((f) => {
      if (f.mensaje) {
        const partes = f.mensaje.split(", ").filter(Boolean);
        setSeleccionadas(partes);
      }
      setAcepta(f.consentimiento?.aceptado ?? null);
      setCargando(false);
    });
  });

  const alternar = (opcion: string) => {
    setSeleccionadas((actuales) =>
      actuales.includes(opcion) ? actuales.filter((item) => item !== opcion) : [...actuales, opcion]
    );
  };

  const guardar = async () => {
    const mensaje = seleccionadas.join(", ");
    await guardarFicha({
      contactos: [],
      mensaje,
      consentimiento: acepta !== null ? { aceptado: acepta, fecha: new Date().toISOString() } : undefined,
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  };

  const retirarConsentimiento = async () => {
    setAcepta(false);
    await guardarConsentimiento({ aceptado: false, fecha: new Date().toISOString() });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  };

  if (cargando) {
    return (
      <ScrollView contentContainerStyle={estilos.pagina}>
        <Text style={estilos.texto}>Cargando…</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Encabezado
        onVolver={() => router.back()}
        escuchar={() => void voz.escuchar("Completa tu ficha de emergencia")}
      />
      <Aviso tipo="azul">Tu ficha y consentimiento solo están en tu teléfono. La app no los sube a la nube.</Aviso>

      <Text style={estilos.subtitulo}>Situaciones que debe saber quien te ayude:</Text>

      {OPCIONES.map((opcion) => (
        <Pressable key={opcion} onPress={() => alternar(opcion)} style={estilos.casilla}>
          <Text style={estilos.texto}>{seleccionadas.includes(opcion) ? "☑" : "☐"} {opcion}</Text>
        </Pressable>
      ))}

      <Pressable onPress={() => setSeleccionadas([])} style={estilos.casilla}>
        <Text style={estilos.texto}>☐ Ninguna</Text>
      </Pressable>

      <Text style={estilos.ayuda}>Mi ficha solo la verán mi familia y mi brigada si pido ayuda.</Text>

      <View style={estilos.separador} />

      <Text style={estilos.subtitulo}>Consentimiento para compartir mi ficha en emergencia:</Text>

      <View style={estilos.filaConsentimiento}>
        <Boton
          variante={acepta === true ? "confirmar" : "secundario"}
          onPress={() => setAcepta(true)}
          style={{ flex: 1 }}
        >
          Sí, acepto
        </Boton>
        <Boton
          variante={acepta === false ? "confirmar" : "secundario"}
          onPress={() => setAcepta(false)}
          style={{ flex: 1 }}
        >
          No, gracias
        </Boton>
      </View>

      <Boton
        variante="peligro"
        onPress={() => void retirarConsentimiento()}
        disabled={acepta === false}
        style={{ marginTop: 8 }}
      >
        Retirar consentimiento
      </Boton>

      <Text style={estilos.ayuda}>
        Si retiras el consentimiento, tu ficha no se enviará por SMS en una emergencia.
      </Text>

      <Boton onPress={() => void guardar()}>
        {guardado ? "Guardado" : "Guardar"}
      </Boton>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 12, padding: 16 },
  subtitulo: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  casilla: { minHeight: 52, justifyContent: "center", padding: 12, borderRadius: 10, backgroundColor: "#F4F1EA" },
  texto: { fontSize: 18, lineHeight: 26 },
  ayuda: { fontSize: 18, color: "#4A4A4A", lineHeight: 24 },
  separador: { marginVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  filaConsentimiento: { flexDirection: "row", gap: 8 },
});