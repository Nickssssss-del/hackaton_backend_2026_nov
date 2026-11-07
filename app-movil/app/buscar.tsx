import { Link, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Linking } from "react-native";
import { useServicios } from "../src/controladores/useServicios";
import { useVoz } from "../src/controladores/useVoz";
import { OFICIOS } from "../src/modelos/tipos";
import { BotonVoz } from "../src/vistas/componentes/BotonVoz";
import { TarjetaServicio } from "../src/vistas/componentes/TarjetaServicio";
import { Encabezado } from "../src/vistas/componentes/Encabezado";
import { BotonEmergencia } from "../src/vistas/componentes/BotonEmergencia";
import { useTema } from "../src/vistas/tema/useTema";

export default function PantallaBuscar() {
  const router = useRouter();
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));

  const servicios = useServicios();
  const [textoVoz, setTextoVoz] = useState("");

  const voz = useVoz((texto) => {
    setTextoVoz(texto);
    servicios.setBusqueda(texto);
  });

  const irAlRegistro = useCallback(() => {
    router.push("/registro/nombre");
  }, [router]);

  const irAPublicar = useCallback(() => {
    router.push("/publicar");
  }, [router]);

  const onVolver = useCallback(() => {
    router.back();
  }, [router]);

  const onEscuchar = useCallback(() => {
    // Se implementará con useEscuchar en la Parte A completa
  }, []);

  // Determinar si la primera tarjeta tiene Visto Bueno para la etiqueta "Más recomendado"
  let primeraConVistoBueno = true;

  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={onVolver} escuchar={onEscuchar} />

      {/* Caja "¿Qué buscas?" con botón Hablar */}
      <View style={[estilos.cajaBusqueda, { backgroundColor: tema.colores.superficie }]}>
        <Text style={[estilos.tituloBusqueda, { fontSize: tamano(20), color: tema.colores.texto }]}>¿Qué buscas?</Text>
        <View style={estilos.filaBusqueda}>
          <BotonVoz escuchando={voz.escuchando} onPulsar={() => voz.alternar()} />
          {voz.teclado ? (
            <View style={estilos.tecladoWrapper}>
              <TextInput
                value={textoVoz}
                onChangeText={(valor: string) => {
                  setTextoVoz(valor);
                  servicios.setBusqueda(valor);
                }}
                placeholder="Escribe lo que buscas"
                style={[estilos.teclado, { fontSize: tamano(28), color: tema.colores.texto, backgroundColor: tema.colores.superficie }]}
                maxLength={140}
              />
            </View>
          ) : null}
        </View>
      </View>

      {/* Aviso amarillo sin conexión */}
      {servicios.conexion !== "conectado" && servicios.copiaFecha && (
        <View style={estilos.avisoSinConexion}>
          <Text style={estilos.avisoTexto}>Sin conexión · copia del {servicios.copiaFecha}</Text>
        </View>
      )}

      {/* Chip "Abierto ahora" */}
      <Pressable
        onPress={() => servicios.setSoloAbiertos(!servicios.soloAbiertos)}
        style={[
          estilos.chip,
          servicios.soloAbiertos ? { backgroundColor: tema.colores.accion } : { backgroundColor: tema.colores.superficie },
        ]}
      >
        <Text style={[
          estilos.chipTexto,
          { fontSize: tamano(16), color: servicios.soloAbiertos ? tema.colores.fondo : tema.colores.texto },
        ]}>
          {servicios.soloAbiertos ? "✓ Abierto ahora" : "Abierto ahora"}
        </Text>
      </Pressable>

      {/* Chips de oficio con ícono y desplazamiento horizontal */}
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chipsContainer}>
        {OFICIOS.map((of) => (
          <Pressable
            key={of}
            onPress={() => servicios.setOficio(servicios.oficio === of ? null : of)}
            style={[
              estilos.chipOficio,
              servicios.oficio === of ? { backgroundColor: tema.colores.accion } : { backgroundColor: tema.colores.superficie },
            ]}
          >
            <Text style={[
              estilos.chipOficioTexto,
              { fontSize: tamano(16), color: servicios.oficio === of ? tema.colores.fondo : tema.colores.texto },
            ]}>
              {iconoOficio(of)} {servicios.oficio === of ? "✓ " : ""}{formatearOficio(of)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Estados */}
      {servicios.cargando && servicios.todos.length === 0 && (
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color={tema.colores.accion} />
        </View>
      )}

      {servicios.error && (
        <View style={[estilos.centrado, { padding: 16 }]}>
          <Text style={[estilos.errorTexto, { fontSize: tamano(18), color: tema.colores.peligro }]}>{servicios.error}</Text>
        </View>
      )}

      {/* Lista vacía por oficio */}
      {!servicios.cargando && !servicios.error && servicios.servicios.length === 0 && (
        <View style={[estilos.vacio, { backgroundColor: tema.colores.superficie }]}>
          <Text style={[estilos.vacioTexto, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>
            {servicios.oficio ? `Aún no hay ${formatearOficio(servicios.oficio)} cerca` : "No hay servicios que coincidan"}
          </Text>
          <Pressable onPress={irAPublicar} style={[estilos.botonOfrecer, { backgroundColor: tema.colores.accion }]}>
            <Text style={[estilos.botonOfrecerTexto, { fontSize: tamano(18), color: tema.colores.fondo }]}>Ofrecer mi servicio</Text>
          </Pressable>
        </View>
      )}

      {/* Lista de tarjetas */}
      {servicios.servicios.map((servicio, index) => {
        const esPrimeraConVB = primeraConVistoBueno && (servicio.vistoBuenos300m > 0 || servicio.vistoBuenoTotal > 0);
        if (esPrimeraConVB) primeraConVistoBueno = false;

        return (
          <Link key={servicio.id} href={`/servicio/${servicio.id}`}>
            <TarjetaServicio
              servicio={servicio}
              minutos={servicio._minutos}
              esPrimeraConVistoBueno={esPrimeraConVB}
            />
          </Link>
        );
      })}

      {/* Botón "Ofrecer mi servicio" visible siempre al final de la lista */}
      {servicios.servicios.length > 0 && (
        <Pressable onPress={irAPublicar} style={[estilos.botonOfrecer, { backgroundColor: tema.colores.accion, marginTop: 8 }]}>
          <Text style={[estilos.botonOfrecerTexto, { fontSize: tamano(18), color: tema.colores.fondo }]}>Ofrecer mi servicio</Text>
        </Pressable>
      )}

      {/* Acceso a Mis servicios */}
      <Pressable onPress={() => router.push("/mis-servicios")} style={[estilos.botonOfrecer, { backgroundColor: tema.colores.superficie, borderWidth: 1, borderColor: tema.colores.textoSecundario, marginTop: 8 }]}>
        <Text style={[estilos.botonOfrecerTexto, { fontSize: tamano(18), color: tema.colores.texto }]}>Mis servicios</Text>
      </Pressable>

      {/* BotonEmergencia compacto abajo */}
      <BotonEmergencia onPulsar={() => router.push("/emergencia")} />
    </ScrollView>
  );
}

function iconoOficio(oficio: string): string {
  const iconos: Record<string, string> = {
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
  return iconos[oficio] ?? "🔧";
}

function formatearOficio(oficio: string): string {
  return oficio
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

const estilos = StyleSheet.create({
  pagina: { gap: 12, padding: 16, paddingBottom: 24 },
  cajaBusqueda: { borderRadius: 12, padding: 14, gap: 10 },
  tituloBusqueda: { fontWeight: "700" },
  filaBusqueda: { flexDirection: "row", alignItems: "center", gap: 10 },
  tecladoWrapper: { flex: 1 },
  teclado: { minHeight: 72, borderRadius: 8, paddingHorizontal: 12 },
  avisoSinConexion: {
    backgroundColor: "#FFF1C2",
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 0,
  },
  avisoTexto: {
    fontSize: 16,
    fontWeight: "500",
    color: "#3D2E00",
    textAlign: "center",
  },
  chip: { minHeight: 48, justifyContent: "center", paddingHorizontal: 16, borderRadius: 24 },
  chipTexto: { fontWeight: "700", textAlign: "center" },
  chipsContainer: { flexDirection: "row", gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  chipOficio: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: 22 },
  chipOficioTexto: { fontWeight: "700", textAlign: "center" },
  centrado: { alignItems: "center", justifyContent: "center", minHeight: 120 },
  vacio: { alignItems: "center", padding: 24, borderRadius: 12, gap: 12 },
  vacioTexto: { textAlign: "center" },
  botonOfrecer: { minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  botonOfrecerTexto: { fontWeight: "700" },
  errorTexto: { textAlign: "center" },
});