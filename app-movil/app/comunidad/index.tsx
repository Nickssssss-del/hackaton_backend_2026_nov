/**
 * Vista. F2 · Comunidad (Mockup v4, p. 21).
 * Kermeses, misas, ayuda social, donaciones y talleres de mi barrio (vista publicaciones_cercanas).
 * «Voy» marca mi asistencia (tabla asistencias) y muestra cuántos van. Tocar una publicación abre
 * sus comentarios. Pie: «Publicar algo» → F3.
 */
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePublicaciones, useVoy } from "../../src/controladores/useComunidad";
import { ETIQUETA_PUBLICACION, type CategoriaPublicacion } from "../../src/modelos/comunidad";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { TarjetaPublicacion } from "../../src/vistas/componentes/TarjetaPublicacion";
import { Texto } from "../../src/vistas/componentes/Texto";
import { ALTO_TACTIL, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

type Filtro = "todas" | CategoriaPublicacion;
const FILTROS: Filtro[] = ["todas", "kermes", "misa", "ayuda_social", "donacion", "taller", "otro"];

export default function Comunidad() {
  const { tema } = useTema();
  const c = tema.colores;
  const lista = usePublicaciones();
  const voy = useVoy();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const visibles = filtro === "todas" ? lista.publicaciones : lista.publicaciones.filter((p) => p.categoria === filtro);

  const textoEscuchar =
    visibles.length === 0
      ? "Comunidad. Aquí verás kermeses, misas y avisos de tu barrio. Toca Publicar algo para avisar a tus vecinos."
      : `Comunidad. Hay ${visibles.length} ${visibles.length === 1 ? "publicación" : "publicaciones"}. ${visibles
          .slice(0, 3)
          .map((p) => `${ETIQUETA_PUBLICACION[p.categoria]}: ${p.mensaje}`)
          .join(". ")}`;

  return (
    <Pantalla
      titulo="Comunidad"
      volver
      textoEscuchar={textoEscuchar}
      pie={
        <BotonPrincipal variante="tocar" icono="plus" onPress={() => router.push("/comunidad/publicar")}>
          Publicar algo
        </BotonPrincipal>
      }
    >
      <View style={estilos.filtros}>
        {FILTROS.map((f) => {
          const activo = filtro === f;
          return (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              onPress={() => setFiltro(f)}
              style={[estilos.filtro, { borderColor: activo ? c.accion : c.borde, backgroundColor: activo ? c.accion : c.superficie }]}
            >
              <Texto variante="etiqueta" color={activo ? c.sobreColor : c.texto}>
                {f === "todas" ? "Todas" : ETIQUETA_PUBLICACION[f]}
              </Texto>
            </Pressable>
          );
        })}
      </View>

      {lista.sinZona ? (
        <>
          <Mensaje tono="aviso">Para ver la comunidad de tu barrio, primero elige tu barrio.</Mensaje>
          <BotonPrincipal variante="tocar" icono="home-city-outline" onPress={() => router.push({ pathname: "/alta/zona", params: { editar: "1" } })}>
            Elegir mi barrio
          </BotonPrincipal>
        </>
      ) : null}
      {lista.error ? <Mensaje tono="aviso">{lista.error}</Mensaje> : null}
      {voy.error ? <Mensaje tono="aviso">{voy.error}</Mensaje> : null}
      {lista.cargando ? <Texto variante="ayuda">Buscando novedades de tu barrio…</Texto> : null}
      {!lista.cargando && !lista.error && !lista.sinZona && visibles.length === 0 ? (
        <Mensaje tono="info">Todavía no hay publicaciones. ¡Sé la primera persona en avisar algo!</Mensaje>
      ) : null}

      {visibles.map((p) => (
        <TarjetaPublicacion key={p.id} publicacion={p} ocupado={voy.ocupado} onVoy={() => void voy.alternar(p.id, !p.voy)} />
      ))}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  filtros: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filtro: { minHeight: ALTO_TACTIL, paddingHorizontal: 14, borderRadius: RADIO.pastilla, borderWidth: 2, justifyContent: "center" },
});
