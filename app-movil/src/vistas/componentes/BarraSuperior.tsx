/**
 * Vista. Componente común CC-01 del Mockup v4: Volver (cuando aplica), Aa, luna y altavoz.
 * - Aa recorre Normal → Grande → Enorme (INC-30, propuesta aprobada).
 * - Luna activa o desactiva el modo oscuro; se recuerda en todas las pantallas.
 * - Altavoz lee en voz alta el texto de la pantalla.
 */
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferencias } from "../../controladores/PreferenciasContexto";
import { useEscuchar } from "../../controladores/useEscuchar";
import { ALTO_TACTIL, RADIO, TAMANOS_LETRA } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono, type NombreIcono } from "./Icono";
import { Texto } from "./Texto";

type Props = {
  /** true: router.back(). Función: acción propia. Sin valor: no se muestra (A1, A6, B1, B2, C3, G1–G3). */
  volver?: boolean | (() => void);
  /** Texto que lee el botón Escuchar. */
  textoEscuchar?: string;
};

export function BarraSuperior({ volver, textoEscuchar }: Props) {
  const { tema } = useTema();
  const { tamano, siguienteTamano, oscuro, setOscuro } = usePreferencias();
  const voz = useEscuchar();
  const alVolver = typeof volver === "function" ? volver : () => router.back();

  const pastilla = [estilos.pastilla, { backgroundColor: tema.colores.superficie, borderColor: tema.colores.borde }];
  const circulo = [estilos.circulo, { backgroundColor: tema.colores.superficie, borderColor: tema.colores.borde }];

  return (
    <View style={estilos.fila}>
      {volver ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={alVolver} style={pastilla} hitSlop={6}>
          <Icono nombre="chevron-left" color={tema.colores.accion} tamano={22} />
          <Texto variante="etiqueta" color={tema.colores.accion}>Volver</Texto>
        </Pressable>
      ) : (
        <View />
      )}
      <View style={estilos.derecha}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tamaño de letra: ${TAMANOS_LETRA[tamano].etiqueta}. Toca para cambiar.`}
          onPress={siguienteTamano}
          style={circulo}
        >
          <Texto variante="etiqueta" color={tema.colores.accion} maxFontSizeMultiplier={1}>Aa</Texto>
        </Pressable>
        <BotonCircular
          icono={oscuro ? "white-balance-sunny" : "moon-waning-crescent"}
          etiqueta={oscuro ? "Modo oscuro: Sí. Toca para quitarlo." : "Modo oscuro: No. Toca para activarlo."}
          onPress={() => setOscuro(!oscuro)}
          estilo={circulo}
        />
        <BotonCircular
          icono="volume-high"
          etiqueta="Escuchar esta pantalla"
          onPress={() => void voz.escuchar(textoEscuchar ?? "", true)}
          estilo={circulo}
        />
      </View>
    </View>
  );
}

function BotonCircular({ icono, etiqueta, onPress, estilo }: {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
  estilo: object;
}) {
  const { tema } = useTema();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={etiqueta} onPress={onPress} style={estilo}>
      <Icono nombre={icono} color={tema.colores.accion} tamano={22} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 },
  derecha: { flexDirection: "row", gap: 8 },
  pastilla: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: ALTO_TACTIL,
    paddingHorizontal: 12,
    borderRadius: RADIO.pastilla,
    borderWidth: 1.5,
  },
  circulo: {
    minWidth: ALTO_TACTIL,
    height: ALTO_TACTIL,
    paddingHorizontal: 6,
    borderRadius: RADIO.pastilla,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
