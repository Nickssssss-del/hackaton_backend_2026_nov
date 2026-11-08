/**
 * Vista. A3.2 · ¿Cuál es tu barrio? (Paso 1 de 4).
 * Lista de zonas de la base (tabla zonas: nombre y distrito). Aparece cuando el GPS no dejó zona
 * (la persona está fuera de las zonas, no dio permiso o eligió «Decir mi dirección»), y desde
 * Mis datos › Mi barrio para cambiarla. Sin zona no se ven Servicios, Comunidad ni Ayuda.
 * Si la ubicación guardada cae en una zona, se marca «Estás aquí».
 */
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { guardarZonaElegida, leerPerfil } from "../../src/controladores/registroVecinos";
import { useZona } from "../../src/controladores/useZona";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Icono } from "../../src/vistas/componentes/Icono";
import { IndicadorPasos } from "../../src/vistas/componentes/IndicadorPasos";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { ALTO_TACTIL, colorIcono, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

export default function TuBarrio() {
  const { tema } = useTema();
  const c = tema.colores;
  const editando = useLocalSearchParams<{ editar?: string }>().editar === "1";
  const { zonas, cargando, asignarDesdeUbicacion } = useZona();
  const [elegida, setElegida] = useState<string | null>(null);
  const [cercana, setCercana] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (zonas.length === 0) return;
    void leerPerfil().then((p) => {
      if (p.zonaId) setElegida((e) => e ?? p.zonaId ?? null);
      if (typeof p.lat === "number" && typeof p.lng === "number") {
        const aqui = asignarDesdeUbicacion(p.lat, p.lng);
        setCercana(aqui);
        if (aqui) setElegida((e) => e ?? aqui);
      }
    });
  }, [zonas, asignarDesdeUbicacion]);

  const ordenadas = useMemo(
    () => [...zonas].sort((a, b) => (a.id === cercana ? -1 : b.id === cercana ? 1 : a.nombre.localeCompare(b.nombre))),
    [zonas, cercana],
  );

  const seguir = async () => {
    if (!elegida) return;
    setGuardando(true);
    await guardarZonaElegida(elegida);
    setGuardando(false);
    if (editando) router.back();
    else router.push("/alta/datos");
  };

  const nombres = ordenadas.map((z) => z.nombre).join(", ");

  return (
    <Pantalla
      titulo={editando ? "Mi barrio" : "¿Cuál es tu barrio?"}
      volver
      encabezado={editando ? undefined : <IndicadorPasos paso={1} />}
      textoEscuchar={`${editando ? "Mi barrio" : "Paso 1 de 4. ¿Cuál es tu barrio?"}. Elige uno: ${nombres}.`}
      pie={
        <BotonPrincipal variante={editando ? "listo" : "tocar"} icono={editando ? "check" : undefined} cargando={guardando} motivoDesactivado={elegida ? null : "Elige tu barrio"} onPress={() => void seguir()}>
          {editando ? "Guardar" : "Seguir"}
        </BotonPrincipal>
      }
    >
      <Texto variante="ayuda">Así te mostramos los servicios, la comunidad y los vecinos de tu barrio.</Texto>
      {cargando && zonas.length === 0 ? <Texto variante="ayuda">Buscando los barrios…</Texto> : null}
      {!cargando && zonas.length === 0 ? (
        <Mensaje tono="aviso">No pude traer la lista de barrios. Revisa tu internet y vuelve a intentar.</Mensaje>
      ) : null}
      <View style={estilos.lista} accessibilityRole="radiogroup" accessibilityLabel="Barrios">
        {ordenadas.map((z) => {
          const activa = elegida === z.id;
          const tono = colorIcono(activa ? "azul" : "gris", tema.oscuro);
          return (
            <Pressable
              key={z.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={`${z.nombre}, ${z.distrito}${z.id === cercana ? ". Estás aquí" : ""}`}
              onPress={() => setElegida(z.id)}
              style={[
                estilos.opcion,
                { backgroundColor: activa ? c.accionSuave : c.superficie, borderColor: activa ? c.accion : c.borde, borderWidth: activa ? 3 : 1.5 },
              ]}
            >
              <View style={[estilos.circulo, { backgroundColor: tono.fondo }]}>
                <Icono nombre={activa ? "check" : "home-city-outline"} tamano={26} color={tono.icono} />
              </View>
              <View style={{ flex: 1 }}>
                <Texto variante="etiqueta">{z.nombre}</Texto>
                <Texto variante="ayuda" color={c.textoSecundario}>{z.id === cercana ? `${z.distrito} · Estás aquí` : z.distrito}</Texto>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: 10 },
  opcion: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: ALTO_TACTIL + 20, borderRadius: RADIO.l, padding: 12 },
  circulo: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
