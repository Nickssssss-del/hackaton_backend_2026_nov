/**
 * Vista. Avatar redondo del Inicio. Señora y joven hombre vienen del Mockup v4; el señor y la
 * joven mujer se dibujaron con el mismo estilo plano para que haya variedad.
 */
import { Image, type ImageStyle, type StyleProp } from "react-native";
import type { TipoAvatar } from "../../modelos/avatar";

const IMAGENES: Record<TipoAvatar, number> = {
  senora: require("../../../assets/ilustraciones/avatar-rosa.png"),
  senor: require("../../../assets/ilustraciones/avatar-senor.png"),
  jovenHombre: require("../../../assets/ilustraciones/avatar-carlos.png"),
  jovenMujer: require("../../../assets/ilustraciones/avatar-joven-mujer.png"),
};

export function Avatar({ tipo, tamano = 56, estilo }: { tipo: TipoAvatar; tamano?: number; estilo?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={IMAGENES[tipo]}
      accessibilityIgnoresInvertColors
      style={[{ width: tamano, height: tamano, borderRadius: tamano / 2 }, estilo]}
    />
  );
}
