/**
 * Vista. F1 · Ayuda entre vecinos (Mockup v4, p. 20).
 * Pestañas «Necesito» / «Quiero ayudar».
 * - Necesito: 4 tarjetas de color (Desastre natural, Salud, Compras, Una manito) → F1.1 Pedir.
 *   «Desastre natural» todavía no existe en la base (SQL en borrador): se avisa con honestidad.
 *   Pie: «Contar con mi voz» → F1.1 con el micrófono como entrada.
 * - Quiero ayudar: pedidos de la zona (vista pedidos_cercanos) con «Yo ayudo» (RPC yo_ayudo).
 * Parámetro opcional `pestana=ayudar` para abrir directo en «Quiero ayudar» (tarjeta de B2).
 */
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { usePedidosCercanos } from "../../src/controladores/usePedidosCercanos";
import { faltaParaEscribir, sinBase, useOfrecerAyuda } from "../../src/controladores/useAyudaVecinos";
import { usePerfil } from "../../src/controladores/usePerfil";
import { CATEGORIAS_AYUDA_V4, etiquetaCategoriaAyuda } from "../../src/modelos/categoriasAyuda";
import type { PedidoCercano } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { ESTILO_CATEGORIA } from "../../src/vistas/componentes/estiloCategoriaAyuda";
import { ALTO_TACTIL, colorIcono, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

type Pestana = "necesito" | "ayudar";


export default function AyudaEntreVecinos() {
  const { tema } = useTema();
  const c = tema.colores;
  const params = useLocalSearchParams<{ pestana?: string }>();
  const [pestana, setPestana] = useState<Pestana>(params.pestana === "ayudar" ? "ayudar" : "necesito");

  const textoEscuchar =
    pestana === "necesito"
      ? "Ayuda entre vecinos. Elige qué necesitas: desastre natural, salud, compras o una manito. O toca Contar con mi voz."
      : "Ayuda entre vecinos. Aquí ves lo que piden tus vecinos. Toca Yo ayudo para ver su número.";

  return (
    <Pantalla
      titulo="Ayuda entre vecinos"
      volver
      textoEscuchar={textoEscuchar}
      pie={
        pestana === "necesito" ? (
          <BotonPrincipal variante="tocar" icono="microphone" onPress={() => router.push({ pathname: "/ayuda-vecinos/pedir", params: { voz: "1" } })}>
            Contar con mi voz
          </BotonPrincipal>
        ) : undefined
      }
    >
      <View style={[estilos.segmento, { backgroundColor: tema.oscuro ? c.superficie : "#EEEAE3" }]} accessibilityRole="tablist">
        {(
          [
            ["necesito", "Necesito"],
            ["ayudar", "Quiero ayudar"],
          ] as const
        ).map(([valor, etiqueta]) => {
          const activo = pestana === valor;
          return (
            <Pressable
              key={valor}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              onPress={() => setPestana(valor)}
              style={[estilos.pestana, activo && { backgroundColor: c.accion }]}
            >
              <Texto variante="etiqueta" centrado color={activo ? "#FFFFFF" : c.texto}>{etiqueta}</Texto>
            </Pressable>
          );
        })}
      </View>

      {pestana === "necesito" ? <Necesito /> : <QuieroAyudar />}
    </Pantalla>
  );
}

function Necesito() {
  const { tema } = useTema();
  const [avisoDesastre, setAvisoDesastre] = useState(false);
  return (
    <>
      <View style={estilos.rejilla}>
        {CATEGORIAS_AYUDA_V4.map((cat) => {
          const estilo = ESTILO_CATEGORIA[cat.valor];
          const tono = colorIcono(estilo.color, tema.oscuro);
          return (
            <Pressable
              key={cat.valor}
              accessibilityRole="button"
              accessibilityLabel={cat.ayuda ? `${cat.etiqueta}, ${cat.ayuda}` : cat.etiqueta}
              onPress={() => {
                if (!cat.disponibleEnBase) {
                  setAvisoDesastre(true);
                  return;
                }
                router.push({ pathname: "/ayuda-vecinos/pedir", params: { categoria: cat.valor } });
              }}
              style={({ pressed }) => [
                estilos.tarjeta,
                { backgroundColor: tono.fondo, borderColor: tono.icono, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Icono nombre={estilo.icono} tamano={40} color={tono.icono} />
              <Texto variante="subtitulo" centrado>{cat.etiqueta}</Texto>
              {cat.ayuda ? <Texto variante="ayuda" centrado color={tema.colores.textoSecundario}>{cat.ayuda}</Texto> : null}
            </Pressable>
          );
        })}
      </View>
      {avisoDesastre ? (
        <>
          <Mensaje tono="aviso">
            Los pedidos por sismo o lluvia todavía no se pueden enviar: el equipo los está preparando. Si hay peligro ahora, usa Emergencia.
          </Mensaje>
          <BotonPrincipal variante="emergencia" icono="alert-outline" onPress={() => router.push("/emergencia")}>
            Emergencia
          </BotonPrincipal>
        </>
      ) : null}
    </>
  );
}

function QuieroAyudar() {
  const { perfil } = usePerfil();
  const { pedidos, cargando, error, copiaFecha } = usePedidosCercanos();
  const ayuda = useOfrecerAyuda();
  const ajenos = pedidos.filter((p) => !p.esMio);
  const faltaServidor = sinBase();

  if (!perfil?.zonaId) {
    return <Mensaje tono="aviso">Para ver los pedidos de tu barrio, primero marca dónde vives en Mis datos.</Mensaje>;
  }

  if (faltaServidor) {
    return <Mensaje tono="aviso">{faltaServidor}</Mensaje>;
  }

  return (
    <>
      {copiaFecha ? <Mensaje tono="info">{`Sin internet. Copia guardada del ${copiaFecha}.`}</Mensaje> : null}
      {error ? <Mensaje tono="aviso">{error}</Mensaje> : null}
      {ayuda.error ? <Mensaje tono="aviso">{ayuda.error}</Mensaje> : null}
      {cargando ? <Texto variante="ayuda">Buscando pedidos de tu barrio…</Texto> : null}
      {!cargando && !error && ajenos.length === 0 ? (
        <Mensaje tono="listo">Por ahora nadie de tu barrio pide ayuda.</Mensaje>
      ) : null}
      {ajenos.map((p) => (
        <TarjetaPedido
          key={p.id}
          pedido={p}
          ocupado={ayuda.ocupado === p.id}
          contacto={ayuda.contacto?.pedidoId === p.id ? ayuda.contacto : null}
          onAyudar={() =>
            void faltaParaEscribir().then((falta) => {
              if (falta === "celular") router.push("/perfil/celular");
              else void ayuda.ofrecer(p.id);
            })
          }
        />
      ))}
    </>
  );
}

function TarjetaPedido({
  pedido,
  ocupado,
  contacto,
  onAyudar,
}: {
  pedido: PedidoCercano;
  ocupado: boolean;
  contacto: { nombre: string; celular: string } | null;
  onAyudar: () => void;
}) {
  const { tema } = useTema();
  const c = tema.colores;
  const estilo = ESTILO_CATEGORIA[pedido.categoria];
  const tono = colorIcono(estilo.color, tema.oscuro);
  return (
    <View style={[estilos.pedido, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <View style={estilos.filaPedido}>
        <View style={[estilos.circulo, { backgroundColor: tono.fondo }]}>
          <Icono nombre={estilo.icono} tamano={28} color={tono.icono} />
        </View>
        <View style={{ flex: 1 }}>
          <Texto variante="etiqueta">{etiquetaCategoriaAyuda(pedido.categoria)}</Texto>
          <Texto variante="ayuda" color={c.textoSecundario}>{`${pedido.nombreCorto} · ${pedido.antiguedad}`}</Texto>
        </View>
      </View>
      {pedido.descripcion ? <Texto>{pedido.descripcion}</Texto> : null}
      {contacto ? (
        <>
          <Mensaje tono="aviso">Nunca des dinero ni claves por adelantado.</Mensaje>
          <BotonPrincipal variante="listo" icono="phone" onPress={() => void Linking.openURL(`tel:${contacto.celular}`)}>
            {`Llamar a ${contacto.nombre || "tu vecino"}`}
          </BotonPrincipal>
        </>
      ) : pedido.yaOfreci ? (
        <Mensaje tono="listo">Ya ofreciste tu ayuda.</Mensaje>
      ) : (
        <BotonPrincipal variante="secundarioListo" icono="hand-heart-outline" cargando={ocupado} onPress={onAyudar}>
          Yo ayudo
        </BotonPrincipal>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  segmento: { flexDirection: "row", borderRadius: RADIO.l, padding: 6, gap: 6 },
  pestana: { flex: 1, minHeight: ALTO_TACTIL, borderRadius: RADIO.m, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  rejilla: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tarjeta: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 150,
    borderWidth: 2,
    borderRadius: RADIO.l,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pedido: { borderWidth: 1.5, borderRadius: RADIO.l, padding: 14, gap: 10 },
  filaPedido: { flexDirection: "row", alignItems: "center", gap: 12 },
  circulo: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
});
