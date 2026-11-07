/**
 * Vista. Publicar servicio en 3 toques.
 * Toque 1: "Ofrecer mi servicio" (pantalla actual)
 * Toque 2: Cuadrícula de oficios con ícono
 * Toque 3: Pantalla final con aviso antiestafa, casillas y botón Publicar
 */
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { usePublicarServicio } from "../../src/controladores/usePublicarServicio";
import { OFICIOS, type Oficio } from "../../src/modelos/tipos";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { Aviso } from "../../src/vistas/componentes/Aviso";
import { Boton } from "../../src/vistas/componentes/Boton";
import { useTema } from "../../src/vistas/tema/useTema";

const ICONOS_OFICIO: Record<Oficio, string> = {
  cafeteria: "☕",
  bodega: "🏪",
  panaderia: "🍞",
  restaurante: "🍽️",
  mercado: "🛒",
  farmacia: "💊",
  gasfitero: "🔧",
  electricista: "⚡",
  carpintero: "🪚",
  albanil: "🧱",
  pintor: "🎨",
  cerrajero: "🔐",
  costurera: "🧵",
  zapatero: "👞",
  peluqueria: "💇",
  lavanderia: "🧺",
  mecanico: "🔩",
  tecnico_celulares: "📱",
  jardinero: "🌿",
  mototaxi: "🛵",
  cuidado_personas: "🤝",
  clases_particulares: "📚",
  otro: "🔧",
};

function formatearOficio(oficio: Oficio): string {
  return oficio
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default function PantallaPublicar() {
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));
  const publicar = usePublicarServicio();

  const [paso, setPaso] = useState(1);
  const [oficio, setOficio] = useState<Oficio>("bodega");
  const [mostrarTelefono, setMostrarTelefono] = useState(false);
  const [mostrarDireccion, setMostrarDireccion] = useState(false);
  const [disponibleEmergencia, setDisponibleEmergencia] = useState(false);

  const irAPaso2 = () => setPaso(2);
  const irAPaso3 = () => setPaso(3);

  const alPublicar = () => {
    publicar.publicar({
      oficio,
      mostrarTelefono,
      mostrarDireccion,
      disponibleEmergencia,
    });
  };

  const onVolver = () => {
    if (paso === 1) {
      router.back();
    } else {
      setPaso(paso - 1);
    }
  };

  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={onVolver} />

      {paso === 1 && (
        <>
          <Text style={[estilos.titulo, { fontSize: tamano(24), color: tema.colores.texto }]}>
            Ofrecer mi servicio
          </Text>
          <Text style={[estilos.subtitulo, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>
            Elige tu oficio y publica en 3 toques
          </Text>
          <Pressable onPress={irAPaso2} style={[estilos.botonGrande, { backgroundColor: tema.colores.accion }]}>
            <Text style={[estilos.botonGrandeTexto, { fontSize: tamano(20), color: tema.colores.fondo }]}>Continuar</Text>
          </Pressable>
        </>
      )}

      {paso === 2 && (
        <>
          <Text style={[estilos.titulo, { fontSize: tamano(24), color: tema.colores.texto }]}>
            ¿Cuál es tu oficio?
          </Text>
          <View style={estilos.grid}>
            {OFICIOS.map((of) => (
              <Pressable
                key={of}
                onPress={() => { setOficio(of); irAPaso3(); }}
                style={[
                  estilos.tarjetaOficio,
                  oficio === of ? { borderWidth: 3, borderColor: tema.colores.accion } : { borderWidth: 1, borderColor: tema.colores.textoSecundario },
                ]}
              >
                <Text style={[estilos.iconoOficio, { fontSize: tamano(36) }]}>{ICONOS_OFICIO[of]}</Text>
                <Text style={[estilos.nombreOficio, { fontSize: tamano(18), color: tema.colores.texto }]}>{formatearOficio(of)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {paso === 3 && (
        <>
          <Aviso tipo="amarillo">Nadie debe pedirte dinero ni claves por publicar tu servicio.</Aviso>
          <Text style={[estilos.titulo, { fontSize: tamano(20), color: tema.colores.texto }]}>Publicar: {formatearOficio(oficio)}</Text>

          <View style={estilos.filaPermiso}>
            <Text style={[estilos.textoPermiso, { fontSize: tamano(18), color: tema.colores.texto }]}>Mostrar mi teléfono</Text>
            <Switch value={mostrarTelefono} onValueChange={setMostrarTelefono} />
          </View>
          <View style={estilos.filaPermiso}>
            <Text style={[estilos.textoPermiso, { fontSize: tamano(18), color: tema.colores.texto }]}>Mostrar mi dirección</Text>
            <Switch value={mostrarDireccion} onValueChange={setMostrarDireccion} />
          </View>
          <View style={estilos.filaPermiso}>
            <Text style={[estilos.textoPermiso, { fontSize: tamano(18), color: tema.colores.texto }]}>Disponible en emergencias</Text>
            <Switch value={disponibleEmergencia} onValueChange={setDisponibleEmergencia} />
          </View>

          <Pressable
            disabled={publicar.enviando}
            onPress={alPublicar}
            style={[estilos.botonGrande, { backgroundColor: tema.colores.confirmado }]}
          >
            <Text style={[estilos.botonGrandeTexto, { fontSize: tamano(20), color: tema.colores.fondo }]}>
              {publicar.enviando ? "Publicando…" : "Publicar"}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push("/publicar/detalles")} style={estilos.enlaceDetalles}>
            <Text style={[estilos.textoEnlace, { fontSize: tamano(16), color: tema.colores.accion }]}>Agregar más detalles</Text>
          </Pressable>

          {publicar.listo && <Aviso tipo="verde">Tu servicio ya está publicado</Aviso>}
          {publicar.error && <Aviso tipo="amarillo">{publicar.error}</Aviso>}
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 16, padding: 16, paddingBottom: 32 },
  titulo: { fontWeight: "700", textAlign: "center" },
  subtitulo: { textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  tarjetaOficio: {
    width: 140,
    height: 140,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  iconoOficio: {},
  nombreOficio: { fontWeight: "600", textAlign: "center" },
  filaPermiso: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  textoPermiso: { fontWeight: "500" },
  botonGrande: { minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  botonGrandeTexto: { fontWeight: "700" },
  enlaceDetalles: { alignItems: "center", marginTop: 8 },
  textoEnlace: { textDecorationLine: "underline" },
});