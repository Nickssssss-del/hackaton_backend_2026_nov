/**
 * Vista. Ilustraciones simples del Mockup v4 armadas con íconos (sin imágenes externas).
 * Son decorativas: el lector de pantalla las omite. Pendiente: reemplazar por los dibujos
 * finales del mockup cuando estén exportados como imágenes.
 */
import { StyleSheet, View } from "react-native";
import { RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { Icono, type NombreIcono } from "./Icono";

export type TipoIlustracion = "barrio" | "mapa" | "listo" | "modoSencillo" | "modoCompleto";

const ESCENAS: Record<TipoIlustracion, { principal: NombreIcono; laterales: NombreIcono[]; acento: NombreIcono }> = {
  barrio: { principal: "home-group", laterales: ["account-outline", "account-outline"], acento: "heart" },
  mapa: { principal: "map-outline", laterales: ["home-outline"], acento: "map-marker" },
  listo: { principal: "home-heart", laterales: ["account-outline", "account-outline"], acento: "heart" },
  modoSencillo: { principal: "cellphone-text", laterales: [], acento: "format-size" },
  modoCompleto: { principal: "cellphone-cog", laterales: [], acento: "storefront-outline" },
};

export function Ilustracion({ tipo, alto = 150 }: { tipo: TipoIlustracion; alto?: number }) {
  const { tema } = useTema();
  const c = tema.colores;
  const escena = ESCENAS[tipo];
  const fondo = tipo === "modoCompleto" ? c.aviso : c.accionSuave;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[estilos.panel, { minHeight: alto, backgroundColor: fondo }]}
    >
      <View style={estilos.fila}>
        {escena.laterales[0] ? <Icono nombre={escena.laterales[0]} tamano={40} color={c.confirmado} /> : null}
        <Icono nombre={escena.principal} tamano={72} color={c.accion} />
        {escena.laterales[1] ? <Icono nombre={escena.laterales[1]} tamano={40} color={c.confirmado} /> : null}
      </View>
      <View style={estilos.acento}>
        <Icono nombre={escena.acento} tamano={30} color={escena.acento === "heart" || escena.acento === "map-marker" ? c.peligro : c.confirmado} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  panel: { borderRadius: RADIO.l, alignItems: "center", justifyContent: "center", padding: 16, overflow: "hidden" },
  fila: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  acento: { position: "absolute", top: 12, right: 16 },
});
