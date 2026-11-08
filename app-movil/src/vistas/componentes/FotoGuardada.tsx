/**
 * Vista. Foto de un negocio o de una publicación (bucket privado `fotos`).
 * Si no hay foto o no se puede cargar, no ocupa lugar: cada pantalla muestra su ícono.
 */
import { useState } from "react";
import { Image, StyleSheet } from "react-native";
import { useUrlFoto } from "../../controladores/useFoto";
import { RADIO } from "../tema/tokens";

export function FotoGuardada({ ruta, descripcion, alto = 200 }: { ruta?: string; descripcion: string; alto?: number }) {
  const url = useUrlFoto(ruta);
  const [fallo, setFallo] = useState(false);
  if (!url || fallo) return null;
  return (
    <Image
      source={{ uri: url }}
      accessibilityLabel={descripcion}
      accessibilityIgnoresInvertColors
      resizeMode="cover"
      onError={() => setFallo(true)}
      style={[estilos.foto, { height: alto }]}
    />
  );
}

const estilos = StyleSheet.create({
  foto: { width: "100%", borderRadius: RADIO.l },
});
