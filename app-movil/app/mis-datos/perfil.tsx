/**
 * Vista. Editar mi perfil (nombre, celular, barrio).
 * Reutiliza validaciones del registro: nombre 2-60, celular ^9\d{8}$, zona de la lista.
 * Guarda en el teléfono y, con internet, aseguraPerfilEnNube().
 */
import { router } from "expo-router";
import { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { Boton } from "../../src/vistas/componentes/Boton";
import { Aviso } from "../../src/vistas/componentes/Aviso";
import { CampoTexto } from "../../src/vistas/componentes/CampoTexto";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { usePerfil } from "../../src/controladores/usePerfil";
import { useZona } from "../../src/controladores/useZona";
import { leerPerfilLocal } from "../../src/modelos/local/perfil";

export default function PantallaMiPerfil() {
  const { perfil, guardar, asegurarPerfilEnNube, completo } = usePerfil();
  const { zonas } = useZona();
  const voz = useEscuchar();
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos actuales
  useEffect(() => {
    if (perfil) {
      setNombre(perfil.nombre ?? "");
      setCelular(perfil.celular ?? "");
      setZonaId(perfil.zonaId ?? "");
    }
  }, [perfil]);

  const validarNombre = (n: string): string | null => {
    const limpio = n.trim();
    if (limpio.length < 2 || limpio.length > 60) {
      return "El nombre debe tener entre 2 y 60 caracteres.";
    }
    return null;
  };

  const validarCelular = (c: string): string | null => {
    if (!/^9\d{8}$/.test(c)) {
      return "El celular debe tener 9 dígitos y empezar en 9.";
    }
    return null;
  };

  const validarZona = (z: string): string | null => {
    if (!z) return "Elige tu barrio.";
    return null;
  };

  const guardarCambios = async () => {
    const errNombre = validarNombre(nombre);
    const errCelular = validarCelular(celular);
    const errZona = validarZona(zonaId);

    if (errNombre || errCelular || errZona) {
      setError(errNombre || errCelular || errZona);
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const siguiente = { nombre: nombre.trim(), celular, zonaId };
      await guardar(siguiente);
      await asegurarPerfilEnNube();
      setGuardado(true);
      setTimeout(() => setGuardado(false), 1500);
    } catch {
      setError("No se pudo guardar. Inténtalo otra vez.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Encabezado
        onVolver={() => router.back()}
        escuchar={() => void voz.escuchar("Editar mi perfil")}
      />
      <Aviso tipo="azul">Tu nombre, celular y barrio se guardan en el teléfono y, con internet, se suben a la nube.</Aviso>

      {error && <Aviso tipo="amarillo">{error}</Aviso>}

      <View style={estilos.campo}>
        <Text style={estilos.etiqueta}>Nombre</Text>
        <CampoTexto
          autoFocus
          value={nombre}
          onChangeText={setNombre}
          placeholder="Tu nombre"
          maxLength={60}
        />
        {nombre.trim().length > 0 && nombre.trim().length < 2 && (
          <Text style={estilos.aviso}>Mínimo 2 caracteres</Text>
        )}
        {nombre.trim().length > 60 && (
          <Text style={estilos.aviso}>Máximo 60 caracteres</Text>
        )}
      </View>

      <View style={estilos.campo}>
        <Text style={estilos.etiqueta}>Celular</Text>
        <CampoTexto
          keyboardType="number-pad"
          value={celular}
          onChangeText={(v) => setCelular(v.replace(/\D/g, "").slice(0, 9))}
          placeholder="9 dígitos"
          maxLength={9}
        />
        {celular.length > 0 && !/^9\d{8}$/.test(celular) && (
          <Text style={estilos.aviso}>Debe tener 9 dígitos y empezar en 9</Text>
        )}
      </View>

      <View style={estilos.campo}>
        <Text style={estilos.etiqueta}>Barrio</Text>
        {zonas.length === 0 ? (
          <Aviso tipo="amarillo">No hay zonas disponibles. Puedes continuar cuando haya una copia local.</Aviso>
        ) : (
          <View style={estilos.listaZonas}>
            {zonas.map((zona) => (
              <Pressable
                key={zona.id}
                onPress={() => setZonaId(zona.id)}
                style={[
                  estilos.opcionZona,
                  { backgroundColor: zonaId === zona.id ? "#E5EEFC" : "#F4F1EA" },
                  { borderWidth: zonaId === zona.id ? 2 : 0, borderColor: "#1F4E9C" },
                ]}
              >
                <Text style={[estilos.textoZona, { color: zonaId === zona.id ? "#1F4E9C" : "#1B1B1B" }]}>
                  {zona.nombre} ({zona.distrito})
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {zonaId === "" && <Text style={estilos.aviso}>Elige tu barrio</Text>}
      </View>

      <Boton disabled={guardando} onPress={() => void guardarCambios()} style={{ marginTop: 8 }}>
        {guardando ? "Guardando…" : guardado ? "Guardado" : "Guardar cambios"}
      </Boton>

      <Boton variante="secundario" onPress={() => router.back()} style={{ marginTop: 8 }}>
        Volver
      </Boton>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 14, padding: 16 },
  campo: { gap: 6 },
  etiqueta: { fontSize: 18 },
  aviso: { fontSize: 18, color: "#D91023" },
  listaZonas: { gap: 8, maxHeight: 200 },
  opcionZona: { minHeight: 52, justifyContent: "center", padding: 12, borderRadius: 10 },
  textoZona: { fontSize: 18 },
});