/**
 * Vista. Mis pedidos de ayuda (F1, Mockup v4).
 * Muestra mis pedidos abiertos y, por cada uno, los vecinos que se ofrecieron (vista
 * ayudas_recibidas: nombre corto y celular). Quien pidió es quien llama (contrato del Módulo 2, A1).
 * «Ya me ayudaron» y «Cancelar» cambian el estado del pedido en pedidos_ayuda.
 */
import { router } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useMisPedidosVecinos } from "../../src/controladores/useAyudaVecinos";
import { etiquetaCategoriaAyuda } from "../../src/modelos/categoriasAyuda";
import type { AyudaRecibida, PedidoCercano } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { ESTILO_CATEGORIA } from "../../src/vistas/componentes/estiloCategoriaAyuda";
import { colorIcono, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

export default function MisPedidos() {
  const mis = useMisPedidosVecinos();
  const total = mis.pedidos.length;
  const textoEscuchar =
    total === 0
      ? "Mis pedidos. No tienes pedidos abiertos."
      : `Mis pedidos. Tienes ${total} ${total === 1 ? "pedido abierto" : "pedidos abiertos"}. Debajo de cada uno ves a los vecinos que se ofrecieron, con un botón para llamarlos.`;

  return (
    <Pantalla
      titulo="Mis pedidos"
      volver
      textoEscuchar={textoEscuchar}
      pie={
        <BotonPrincipal variante="tocar" icono="plus" onPress={() => router.push("/ayuda-vecinos/pedir")}>
          Pedir ayuda
        </BotonPrincipal>
      }
    >
      {mis.error ? <Mensaje tono="aviso">{mis.error}</Mensaje> : null}
      {mis.cargando ? <Texto variante="ayuda">Buscando tus pedidos…</Texto> : null}
      {!mis.cargando && total === 0 ? <Mensaje tono="info">No tienes pedidos abiertos.</Mensaje> : null}
      {mis.pedidos.map(({ pedido, ayudantes }) => (
        <TarjetaMiPedido
          key={pedido.id}
          pedido={pedido}
          ayudantes={ayudantes}
          onCambiar={(estado) => void mis.cambiarEstado(pedido, estado)}
        />
      ))}
      {total > 0 ? (
        <BotonPrincipal variante="neutro" icono="refresh" onPress={mis.recargar}>
          Ver si alguien más se ofreció
        </BotonPrincipal>
      ) : null}
    </Pantalla>
  );
}

function TarjetaMiPedido({
  pedido,
  ayudantes,
  onCambiar,
}: {
  pedido: PedidoCercano;
  ayudantes: AyudaRecibida[];
  onCambiar: (estado: "atendido" | "cancelado") => void;
}) {
  const { tema } = useTema();
  const c = tema.colores;
  const [confirmar, setConfirmar] = useState<null | "atendido" | "cancelado">(null);
  const estilo = ESTILO_CATEGORIA[pedido.categoria];
  const tono = colorIcono(estilo.color, tema.oscuro);

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <View style={estilos.fila}>
        <View style={[estilos.circulo, { backgroundColor: tono.fondo }]}>
          <Icono nombre={estilo.icono} tamano={28} color={tono.icono} />
        </View>
        <View style={{ flex: 1 }}>
          <Texto variante="etiqueta">{etiquetaCategoriaAyuda(pedido.categoria)}</Texto>
          <Texto variante="ayuda" color={c.textoSecundario}>{pedido.antiguedad}</Texto>
        </View>
      </View>
      {pedido.descripcion ? <Texto>{pedido.descripcion}</Texto> : null}

      {ayudantes.length === 0 ? (
        <Texto variante="ayuda" color={c.textoSecundario}>Todavía nadie se ofreció. Cuando alguien lo haga, aparecerá aquí.</Texto>
      ) : (
        <>
          <Texto variante="etiqueta">{ayudantes.length === 1 ? "Se ofreció:" : `Se ofrecieron ${ayudantes.length}:`}</Texto>
          {ayudantes.map((a) => (
            <BotonPrincipal
              key={a.id}
              variante="listo"
              icono="phone"
              motivoDesactivado={a.ayudanteCelular ? null : "Sin número"}
              onPress={() => void Linking.openURL(`tel:${a.ayudanteCelular}`)}
            >
              {`Llamar a ${a.ayudanteNombre || "tu vecino"}`}
            </BotonPrincipal>
          ))}
          <Mensaje tono="aviso">Nunca des dinero ni claves por adelantado.</Mensaje>
        </>
      )}

      {confirmar ? (
        <>
          <Texto variante="etiqueta">
            {confirmar === "atendido" ? "¿Ya te ayudaron? El pedido se cerrará." : "¿Cancelar este pedido? No se puede deshacer."}
          </Texto>
          <View style={estilos.botones}>
            <BotonPrincipal estilo={estilos.mitad} variante="neutro" onPress={() => setConfirmar(null)}>
              No
            </BotonPrincipal>
            <BotonPrincipal
              estilo={estilos.mitad}
              variante={confirmar === "atendido" ? "listo" : "emergencia"}
              onPress={() => {
                onCambiar(confirmar);
                setConfirmar(null);
              }}
            >
              Sí
            </BotonPrincipal>
          </View>
        </>
      ) : (
        <View style={estilos.botones}>
          <BotonPrincipal estilo={estilos.mitad} variante="secundarioListo" icono="check" onPress={() => setConfirmar("atendido")}>
            Ya me ayudaron
          </BotonPrincipal>
          <BotonPrincipal estilo={estilos.mitad} variante="neutro" onPress={() => setConfirmar("cancelado")}>
            Cancelar
          </BotonPrincipal>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1.5, borderRadius: RADIO.l, padding: 14, gap: 10 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12 },
  circulo: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  botones: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  mitad: { flexGrow: 1, flexBasis: "45%" },
});
