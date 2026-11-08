/**
 * Vista. Ilustraciones del Mockup v4. Las escenas principales son los dibujos del propio mockup
 * (assets/ilustraciones), recortados de la exportación en alta resolución. Son decorativas: el
 * lector de pantalla las omite.
 */
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";

export type TipoIlustracion = "barrio" | "mapa" | "listo" | "modoSencillo" | "modoCompleto";

const IMAGENES: Record<TipoIlustracion, { fuente: ImageSourcePropType; proporcion: number }> = {
  barrio: { fuente: require("../../../assets/ilustraciones/bienvenida.png"), proporcion: 780 / 436 },
  mapa: { fuente: require("../../../assets/ilustraciones/mapa.png"), proporcion: 780 / 508 },
  listo: { fuente: require("../../../assets/ilustraciones/todo-listo.png"), proporcion: 780 / 664 },
  modoSencillo: { fuente: require("../../../assets/ilustraciones/modo-sencillo.png"), proporcion: 780 / 334 },
  modoCompleto: { fuente: require("../../../assets/ilustraciones/modo-completo.png"), proporcion: 780 / 337 },
};

/** `alto` se mantiene por compatibilidad; la imagen conserva la proporción del mockup. */
export function Ilustracion({ tipo, redondeo = true }: { tipo: TipoIlustracion; alto?: number; redondeo?: boolean }) {
  const { tema } = useTema();
  const { fuente, proporcion } = IMAGENES[tipo];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[estilos.marco, { aspectRatio: proporcion }, redondeo && estilos.redondeo, tema.oscuro && estilos.atenuado]}
    >
      <Image source={fuente} style={estilos.imagen} resizeMode="contain" />
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: { width: "100%", overflow: "hidden" },
  redondeo: { borderRadius: RADIO.l },
  // En modo oscuro las escenas claras se atenúan un poco para no deslumbrar.
  atenuado: { opacity: 0.88 },
  imagen: { width: "100%", height: "100%" },
});
