/**
 * Vista. Ilustraciones del Mockup v4. Las escenas principales son los dibujos del propio mockup
 * (assets/ilustraciones), recortados de la exportación en alta resolución. Son decorativas: el
 * lector de pantalla las omite.
 * modoSencillo y modoCompleto usan SVG vectoriales (react-native-svg).
 */
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { SvgXml } from "react-native-svg";

export type TipoIlustracion = "barrio" | "mapa" | "listo" | "modoSencillo" | "modoCompleto" | "despertador";

const IMAGENES: Record<Exclude<TipoIlustracion, "modoSencillo" | "modoCompleto">, { fuente: ImageSourcePropType; proporcion: number }> = {
  barrio: { fuente: require("../../../assets/ilustraciones/bienvenida.png"), proporcion: 780 / 436 },
  mapa: { fuente: require("../../../assets/ilustraciones/mapa.png"), proporcion: 780 / 508 },
  listo: { fuente: require("../../../assets/ilustraciones/todo-listo.png"), proporcion: 780 / 664 },
  despertador: { fuente: require("../../../assets/ilustraciones/reloj-pastilla.png"), proporcion: 560 / 529 },
};

// SVG para modo sencillo (Aa, botones azul/verde/rojo, ondas de sonido)
const SVG_MODO_SENCILLO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-sencillo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EBF3FF" />
      <stop offset="100%" stop-color="#D5E5FF" />
    </linearGradient>
    <filter id="shadow-phone" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#1A2B4C" flood-opacity="0.15" />
    </filter>
    <filter id="shadow-wave" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#1D52B4" flood-opacity="0.25" />
    </filter>
  </defs>
  <rect width="320" height="180" rx="20" fill="url(#bg-sencillo)" />
  <g filter="url(#shadow-phone)">
    <rect x="115" y="20" width="70" height="140" rx="16" fill="#FFFFFF" stroke="#1E293B" stroke-width="3" />
    <path d="M 135 20 H 165 A 4 4 0 0 1 169 24 V 25 A 3 3 0 0 1 166 28 H 134 A 3 3 0 0 1 131 25 V 24 A 4 4 0 0 1 135 20 Z" fill="#1E293B" />
  </g>
  <rect x="133" y="36" width="34" height="22" rx="6" fill="#EEF2FF" />
  <text x="150" y="52" font-family="'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="15" fill="#1D52B4" text-anchor="middle">Aa</text>
  <rect x="126" y="65" width="48" height="22" rx="8" fill="#2563EB" />
  <rect x="126" y="93" width="48" height="22" rx="8" fill="#10B981" />
  <rect x="126" y="121" width="48" height="22" rx="8" fill="#EF4444" />
  <rect x="130" y="68" width="40" height="3" rx="1.5" fill="#FFFFFF" fill-opacity="0.3" />
  <rect x="130" y="96" width="40" height="3" rx="1.5" fill="#FFFFFF" fill-opacity="0.3" />
  <rect x="130" y="124" width="40" height="3" rx="1.5" fill="#FFFFFF" fill-opacity="0.3" />
  <g filter="url(#shadow-wave)">
    <path d="M 200 70 A 20 20 0 0 1 200 110" fill="none" stroke="#2563EB" stroke-width="4.5" stroke-linecap="round" />
    <path d="M 210 60 A 32 32 0 0 1 210 120" fill="none" stroke="#60A5FA" stroke-width="4" stroke-linecap="round" />
  </g>
</svg>`;

// SVG para modo completo (grid de apps 3x3, tarjetas, botón +)
const SVG_MODO_COMPLETO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-completo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="100%" stop-color="#FDE68A" />
    </linearGradient>
    <filter id="shadow-phone-2" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#78350F" flood-opacity="0.12" />
    </filter>
    <filter id="shadow-badge" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="1" dy="3" stdDeviation="3" flood-color="#047857" flood-opacity="0.3" />
    </filter>
  </defs>
  <rect width="320" height="180" rx="20" fill="url(#bg-completo)" />
  <g filter="url(#shadow-phone-2)">
    <rect x="115" y="20" width="70" height="140" rx="16" fill="#FFFFFF" stroke="#1E293B" stroke-width="3" />
    <path d="M 135 20 H 165 A 4 4 0 0 1 169 24 V 25 A 3 3 0 0 1 166 28 H 134 A 3 3 0 0 1 131 25 V 24 A 4 4 0 0 1 135 20 Z" fill="#1E293B" />
  </g>
  <rect x="125" y="42" width="14" height="14" rx="4" fill="#3B82F6" />
  <rect x="143" y="42" width="14" height="14" rx="4" fill="#10B981" />
  <rect x="161" y="42" width="14" height="14" rx="4" fill="#F59E0B" />
  <rect x="125" y="62" width="14" height="14" rx="4" fill="#8B5CF6" />
  <rect x="143" y="62" width="14" height="14" rx="4" fill="#06B6D4" />
  <rect x="161" y="62" width="14" height="14" rx="4" fill="#F97316" />
  <rect x="125" y="82" width="14" height="14" rx="4" fill="#EC4899" />
  <rect x="143" y="82" width="14" height="14" rx="4" fill="#84CC16" />
  <rect x="161" y="82" width="14" height="14" rx="4" fill="#EF4444" />
  <rect x="125" y="104" width="50" height="10" rx="5" fill="#E2E8F0" />
  <rect x="125" y="120" width="36" height="10" rx="5" fill="#CBD5E1" />
  <g filter="url(#shadow-badge)">
    <circle cx="186" cy="42" r="14" fill="#10B981" />
    <path d="M 186 35 V 49 M 179 42 H 193" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" />
  </g>
</svg>`;

/** `alto` se mantiene por compatibilidad; la imagen conserva la proporción del mockup. */
export function Ilustracion({ tipo, redondeo = true }: { tipo: TipoIlustracion; alto?: number; redondeo?: boolean }) {
  const { tema } = useTema();
  
  if (tipo === "modoSencillo") {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[estilos.marco, { aspectRatio: 320 / 180 }, redondeo && estilos.redondeo, tema.oscuro && estilos.atenuado]}
      >
        <SvgXml xml={SVG_MODO_SENCILLO} style={estilos.imagen} />
      </View>
    );
  }
  
  if (tipo === "modoCompleto") {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[estilos.marco, { aspectRatio: 320 / 180 }, redondeo && estilos.redondeo, tema.oscuro && estilos.atenuado]}
      >
        <SvgXml xml={SVG_MODO_COMPLETO} style={estilos.imagen} />
      </View>
    );
  }
  
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
