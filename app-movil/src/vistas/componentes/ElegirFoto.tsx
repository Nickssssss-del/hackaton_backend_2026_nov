/**
 * Vista. Agregar foto: «Tomar foto» o «Elegir de mis fotos», con vista previa y «Quitar».
 * Con `rutaActual` (al editar) muestra la foto ya guardada mientras no se elija otra.
 */
import { Image, StyleSheet, View } from "react-native";
import type { useFotoNueva } from "../../controladores/useFotoNueva";
import { RADIO } from "../tema/tokens";
import { BotonPrincipal } from "./BotonPrincipal";
import { FotoGuardada } from "./FotoGuardada";
import { Mensaje } from "./Mensaje";

export function ElegirFoto({ estado, rutaActual, descripcion }: { estado: ReturnType<typeof useFotoNueva>; rutaActual?: string; descripcion: string }) {
  return (
    <View style={estilos.bloque}>
      {estado.foto ? (
        <Image source={{ uri: estado.foto.uri }} accessibilityLabel={descripcion} style={estilos.vista} resizeMode="cover" />
      ) : (
        <FotoGuardada ruta={rutaActual} descripcion={descripcion} />
      )}
      <View style={estilos.fila}>
        <BotonPrincipal estilo={estilos.mitad} variante="secundario" icono="camera-outline" onPress={() => void estado.tomar("camara")}>
          Tomar foto
        </BotonPrincipal>
        <BotonPrincipal estilo={estilos.mitad} variante="secundario" icono="image-outline" onPress={() => void estado.tomar("galeria")}>
          Mis fotos
        </BotonPrincipal>
      </View>
      {estado.foto ? (
        <BotonPrincipal variante="neutro" icono="close" onPress={estado.quitar}>
          Quitar foto
        </BotonPrincipal>
      ) : null}
      {estado.error ? <Mensaje tono="aviso">{estado.error}</Mensaje> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: 10 },
  vista: { width: "100%", height: 200, borderRadius: RADIO.l },
  fila: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  mitad: { flexGrow: 1, flexBasis: "45%" },
});
