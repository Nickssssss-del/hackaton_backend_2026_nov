import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Boton } from "../../src/vistas/componentes/Boton";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { useEmergencia } from "../../src/controladores/useEmergencia";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useTema } from "../../src/vistas/tema/useTema";

export default function EmergenciaPeligro() {
  const { tema, salirEmergencia } = useTema();
  const emergencia = useEmergencia();
  const voz = useEscuchar();
  const [cargando, setCargando] = useState(true);
  const [punto, setPunto] = useState<Awaited<ReturnType<typeof emergencia.puntoSeguro>>>(null);
  useEffect(() => {
    void emergencia.puntoSeguro().then((resultado) => {
      setPunto(resultado);
      setCargando(false);
    });
  }, [emergencia.puntoSeguro]);
  const volver = () => {
    voz.silenciar();
    salirEmergencia();
    router.replace("/");
  };
  return (
    <View style={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={() => router.replace("/emergencia")} />
      {cargando ? <Text style={[estilos.texto, { color: tema.colores.texto }]}>Buscando un punto seguro…</Text> : null}
      {!cargando && punto ? (
        <>
          <Text style={[estilos.titulo, { color: tema.colores.texto }]}>Punto seguro más cercano</Text>
          <Text style={[estilos.texto, { color: tema.colores.texto }]}>
            {punto.nombre}, ≈ {punto.minutos} min a pie, rumbo {punto.rumbo}.
          </Text>
        </>
      ) : null}
      {!cargando && !punto ? (
        <>
          <Text style={[estilos.titulo, { color: tema.colores.texto }]}>Qué hacer</Text>
          <Text style={[estilos.texto, { color: tema.colores.texto }]}>{emergencia.instrucciones.join(". ")}</Text>
        </>
      ) : null}
      <Boton onPress={() => router.replace("/emergencia")} variante="secundario">Volver</Boton>
      <Boton onPress={volver} variante="secundario">Salir</Boton>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 16, padding: 16 },
  titulo: { fontSize: 24, fontWeight: "700" },
  texto: { fontSize: 18, lineHeight: 26 },
});
