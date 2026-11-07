import { StyleSheet, Text, View } from "react-native";
import type { ServicioPublico } from "../../modelos/tipos";
import { useTema } from "../tema/useTema";

type Props = {
  servicio: ServicioPublico;
  minutos?: number;
  esPrimeraConVistoBueno?: boolean;
};

export function TarjetaServicio({ servicio, minutos, esPrimeraConVistoBueno }: Props) {
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));

  const nVecinos = servicio.vistoBuenos300m > 0 ? servicio.vistoBuenos300m : servicio.vistoBuenoTotal > 0 ? servicio.vistoBuenoTotal : 0;

  return (
    <View style={[estilos.tarjeta, { backgroundColor: tema.colores.superficie }]}>
      <View style={estilos.filaSuperior}>
        <Text style={[estilos.nombre, { fontSize: tamano(20), color: tema.colores.texto }]} numberOfLines={1}>
          {servicio.nombre}
        </Text>
        {esPrimeraConVistoBueno && (
          <View style={estilos.etiquetaRecomendado}>
            <Text style={estilos.etiquetaTexto}>Más recomendado</Text>
          </View>
        )}
      </View>
      <Text style={[estilos.oficio, { fontSize: tamano(16), color: tema.colores.textoSecundario }]}>
        {iconoOficio(servicio.oficio)} {formatearOficio(servicio.oficio)}
      </Text>
      {servicio.precioDesde !== undefined && (
        <Text style={[estilos.precio, { fontSize: tamano(16), color: tema.colores.texto }]}>Desde S/ {servicio.precioDesde}</Text>
      )}
      <View style={estilos.filaInferior}>
        {minutos !== undefined && (
          <Text style={[estilos.detalle, { fontSize: tamano(14), color: tema.colores.textoSecundario }]}>≈ {minutos} min a pie</Text>
        )}
        {nVecinos > 0 && (
          <Text style={[estilos.detalle, { fontSize: tamano(14), color: tema.colores.confirmado }]}>
            Visto Bueno de {nVecinos} vecino{nVecinos > 1 ? "s" : ""}
          </Text>
        )}
        <Text style={[estilos.detalle, { fontSize: tamano(14), color: servicio.abiertoAhora ? tema.colores.confirmado : tema.colores.textoSecundario }]}>
          {servicio.abiertoAhora ? "Abierto ahora" : "Cerrado ahora"}
        </Text>
      </View>
    </View>
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
  tarjeta: {
    borderRadius: 12,
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  filaSuperior: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  nombre: {
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  etiquetaRecomendado: {
    backgroundColor: "#1A6B3C",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  etiquetaTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  oficio: {
    fontWeight: "500",
  },
  precio: {
    fontWeight: "700",
  },
  filaInferior: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  detalle: {
    fontWeight: "500",
  },
});