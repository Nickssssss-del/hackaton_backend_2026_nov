/**
 * Vista. E1 · ¿Qué buscas? (Mockup v4, p. 16).
 * - «Cerca de ti» (azul): todos los negocios ordenados por minutos a pie.
 * - Rejilla de 6 categorías con color → E2 (lista).
 * - Pie «Decir qué busco»: lo dicho se lleva a una categoría («pan» → Panaderías) o a una búsqueda.
 *   Sin micrófono (Expo Go o sin permiso) aparece un campo para escribir.
 */
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useVoz } from "../../src/controladores/useVoz";
import { CATEGORIAS_SERVICIO, categoriaDeTexto } from "../../src/modelos/categoriasServicio";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { ESTILO_CATEGORIA_SERVICIO } from "../../src/vistas/componentes/estiloCategoriaServicio";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { TarjetaAcceso } from "../../src/vistas/componentes/TarjetaAcceso";
import { Texto } from "../../src/vistas/componentes/Texto";
import { colorIcono, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

function buscar(texto: string) {
  const limpio = texto.trim();
  if (!limpio) return;
  const categoria = categoriaDeTexto(limpio);
  router.push({
    pathname: "/servicios/lista",
    params: categoria ? { categoria: categoria.valor } : { texto: limpio },
  });
}

export default function QueBuscas() {
  const { tema } = useTema();
  const c = tema.colores;
  const [escrito, setEscrito] = useState("");
  const alReconocer = useCallback((texto: string) => buscar(texto), []);
  const voz = useVoz(alReconocer);

  return (
    <Pantalla
      titulo="¿Qué buscas?"
      volver
      textoEscuchar="¿Qué buscas? Toca Cerca de ti para ver lo que está más cerca, o elige: agua y luz, menú del día, bodegas, panaderías, farmacias u oficios. También puedes tocar Decir qué busco y hablar."
      pie={
        <BotonPrincipal variante={voz.escuchando ? "listo" : "tocar"} icono={voz.escuchando ? "stop" : "microphone"} onPress={() => void voz.alternar()}>
          {voz.escuchando ? "Te escucho…" : "Decir qué busco"}
        </BotonPrincipal>
      }
    >
      <TarjetaAcceso
        tono="tocar"
        icono="map-marker"
        titulo="Cerca de ti"
        onPress={() => router.push({ pathname: "/servicios/lista", params: { cerca: "1" } })}
      />

      <View style={estilos.rejilla}>
        {CATEGORIAS_SERVICIO.map((cat) => {
          const estilo = ESTILO_CATEGORIA_SERVICIO[cat.valor];
          const tono = colorIcono(estilo.color, tema.oscuro);
          return (
            <Pressable
              key={cat.valor}
              accessibilityRole="button"
              accessibilityLabel={cat.etiqueta}
              onPress={() => router.push({ pathname: "/servicios/lista", params: { categoria: cat.valor } })}
              style={({ pressed }) => [
                estilos.tarjeta,
                { backgroundColor: c.superficie, borderColor: c.borde, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[estilos.cuadro, { backgroundColor: tono.fondo }]}>
                <Icono nombre={estilo.icono} tamano={30} color={tono.icono} />
              </View>
              <Texto variante="etiqueta" centrado>{cat.etiqueta}</Texto>
            </Pressable>
          );
        })}
      </View>

      {voz.teclado ? (
        <>
          <CampoConVoz etiqueta="¿Qué buscas?" ayuda="pan, gasfitero, farmacia" valor={escrito} onCambiar={setEscrito} maxLength={60} sinVoz />
          <BotonPrincipal variante="secundario" icono="magnify" motivoDesactivado={escrito.trim() ? null : "Escribe qué buscas"} onPress={() => buscar(escrito)}>
            Buscar
          </BotonPrincipal>
        </>
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  rejilla: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tarjeta: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 128,
    borderWidth: 1.5,
    borderRadius: RADIO.l,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cuadro: { width: 64, height: 64, borderRadius: RADIO.m, alignItems: "center", justifyContent: "center" },
});
