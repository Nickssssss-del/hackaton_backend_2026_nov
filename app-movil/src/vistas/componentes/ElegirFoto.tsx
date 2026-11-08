/**
 * Vista. «Agregar foto» (E4 y F3, Mockup v4 pp. 19 y 22).
 * - `forma="boton"` (E4): botón «Agregar foto»; `forma="recuadro"` (F3): recuadro punteado con cámara.
 * - Al tocarlo aparecen «Tomar foto» y «Mis fotos». Con foto elegida: vista previa y «Quitar foto».
 * Con `rutaActual` (al editar) muestra la foto guardada mientras no se elija otra.
 */
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import type { useFotoNueva } from "../../controladores/useFotoNueva";
import { RADIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { BotonPrincipal } from "./BotonPrincipal";
import { FotoGuardada } from "./FotoGuardada";
import { Icono } from "./Icono";
import { Mensaje } from "./Mensaje";
import { Texto } from "./Texto";

type Props = {
  estado: ReturnType<typeof useFotoNueva>;
  rutaActual?: string;
  descripcion: string;
  forma?: "boton" | "recuadro";
};

export function ElegirFoto({ estado, rutaActual, descripcion, forma = "boton" }: Props) {
  const { tema } = useTema();
  const c = tema.colores;
  const [abierto, setAbierto] = useState(false);
  const tieneFoto = Boolean(estado.foto);

  return (
    <View style={estilos.bloque}>
      {estado.foto ? (
        <Image source={{ uri: estado.foto.uri }} accessibilityLabel={descripcion} style={estilos.vista} resizeMode="cover" />
      ) : (
        <FotoGuardada ruta={rutaActual} descripcion={descripcion} />
      )}

      {!tieneFoto && !abierto ? (
        forma === "recuadro" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar foto"
            onPress={() => setAbierto(true)}
            style={({ pressed }) => [estilos.recuadro, { borderColor: c.accion, opacity: pressed ? 0.8 : 1 }]}
          >
            <Icono nombre="camera-outline" tamano={44} color={c.accionTexto} />
            <Texto variante="etiqueta" color={c.accionTexto}>Agregar foto</Texto>
          </Pressable>
        ) : (
          <BotonPrincipal variante="secundario" icono="camera-outline" onPress={() => setAbierto(true)}>
            {rutaActual ? "Cambiar foto" : "Agregar foto"}
          </BotonPrincipal>
        )
      ) : null}

      {!tieneFoto && abierto ? (
        <View style={estilos.fila}>
          <BotonPrincipal estilo={estilos.mitad} variante="secundario" icono="camera-outline" onPress={() => void estado.tomar("camara")}>
            Tomar foto
          </BotonPrincipal>
          <BotonPrincipal estilo={estilos.mitad} variante="secundario" icono="image-outline" onPress={() => void estado.tomar("galeria")}>
            Mis fotos
          </BotonPrincipal>
        </View>
      ) : null}

      {tieneFoto ? (
        <BotonPrincipal
          variante="neutro"
          icono="close"
          onPress={() => {
            estado.quitar();
            setAbierto(false);
          }}
        >
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
  recuadro: { minHeight: 150, borderWidth: 2.5, borderStyle: "dashed", borderRadius: RADIO.l, alignItems: "center", justifyContent: "center", gap: 8 },
  fila: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  mitad: { flexGrow: 1, flexBasis: "45%" },
});
