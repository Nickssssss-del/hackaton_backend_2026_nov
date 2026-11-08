/**
 * Vista. E1 · ¿Qué buscas? (Mockup v4, p. 16).
 * - «Cerca de ti» (azul): todos los negocios ordenados por minutos a pie.
 * - Rejilla de categorías con color → E2 (lista). Solo aparecen las que tienen al menos un negocio
 *   en tu barrio: las vacías se ocultan. Si no hay ninguno, se invita a subir el tuyo.
 * - Pie «Decir qué busco»: lo dicho se lleva a una categoría («pan» → Panaderías) o a una búsqueda.
 *   Sin micrófono (Expo Go o sin permiso) aparece un campo para escribir.
 */
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useServicios } from "../../src/controladores/useServicios";
import { useVoz } from "../../src/controladores/useVoz";
import { categoriaDeTexto, categoriasConNegocios } from "../../src/modelos/categoriasServicio";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { ESTILO_CATEGORIA_SERVICIO } from "../../src/vistas/componentes/estiloCategoriaServicio";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
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
  const servicios = useServicios();
  // Solo categorías con al menos un negocio (con la copia guardada también funciona sin internet).
  const categorias = categoriasConNegocios(servicios.todos);
  const sinNegocios = !servicios.cargando && !servicios.error && servicios.todos.length === 0;
  const nombres = categorias.map((cat) => cat.etiqueta.toLowerCase());
  const eleccion =
    nombres.length === 0 ? "" : nombres.length === 1 ? `, o elige ${nombres[0]}` : `, o elige: ${nombres.slice(0, -1).join(", ")} u ${nombres[nombres.length - 1]}`;
  const textoEscuchar = `¿Qué buscas? Toca Cerca de ti para ver lo que está más cerca${eleccion}. También puedes tocar Decir qué busco y hablar.`;

  return (
    <Pantalla
      titulo="¿Qué buscas?"
      volver
      textoEscuchar={textoEscuchar}
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

      {servicios.cargando && categorias.length === 0 ? <Texto variante="ayuda">Buscando negocios de tu barrio…</Texto> : null}
      {sinNegocios ? (
        <>
          <Mensaje tono="info">Aún no hay negocios en tu barrio. Si tienes uno, súbelo para que tus vecinos lo encuentren.</Mensaje>
          <BotonPrincipal variante="secundarioListo" icono="storefront-outline" onPress={() => router.push("/servicios/publicar")}>
            Sube tu negocio
          </BotonPrincipal>
        </>
      ) : null}

      <View style={estilos.rejilla}>
        {categorias.map((cat) => {
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
