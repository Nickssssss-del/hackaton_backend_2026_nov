/**
 * Vista. Mis servicios (Mi negocio de B2) con el diseño del Mockup v4.
 * Cada negocio propio: Ver (E3), Cambiar (E4 con id) y Borrar con confirmación en la misma tarjeta.
 * Pie: «Sube tu negocio» (E4).
 */
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { sinBase } from "../../src/controladores/useAyudaVecinos";
import { useMisServicios } from "../../src/controladores/useMisServicios";
import { useBorrarNegocio } from "../../src/controladores/useServiciosV4";
import { etiquetaOficio, nombreServicio } from "../../src/modelos/categoriasServicio";
import type { ServicioPublico } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { estiloOficio } from "../../src/vistas/componentes/estiloCategoriaServicio";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Insignia } from "../../src/vistas/componentes/Insignia";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { colorIcono, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

export default function MisServicios() {
  const mios = useMisServicios();
  const borrado = useBorrarNegocio();
  const faltaServidor = sinBase();

  const textoEscuchar =
    mios.servicios.length === 0
      ? "Mis servicios. Aún no subes tu negocio. Toca Sube tu negocio."
      : `Mis servicios. Tienes ${mios.servicios.length}: ${mios.servicios.map((s) => nombreServicio(s)).join(", ")}.`;

  return (
    <Pantalla
      titulo="Mis servicios"
      volver
      textoEscuchar={textoEscuchar}
      pie={
        <BotonPrincipal variante="listo" icono="plus" onPress={() => router.push("/servicios/publicar")}>
          Sube tu negocio
        </BotonPrincipal>
      }
    >
      {faltaServidor ? <Mensaje tono="aviso">{faltaServidor}</Mensaje> : null}
      {mios.error && !faltaServidor ? <Mensaje tono="aviso">{mios.error}</Mensaje> : null}
      {mios.cargando ? <Texto variante="ayuda">Buscando tus negocios…</Texto> : null}
      {!mios.cargando && !mios.error && !faltaServidor && mios.servicios.length === 0 ? (
        <Mensaje tono="info">Aún no subes tu negocio.</Mensaje>
      ) : null}
      {borrado.error ? <Mensaje tono="aviso">{borrado.error}</Mensaje> : null}

      {mios.servicios.map((s) => (
        <TarjetaMia key={s.id} servicio={s} borrando={borrado.enviando} onBorrar={() => void borrado.borrar(s.id).catch(() => {})} />
      ))}
    </Pantalla>
  );
}

function TarjetaMia({ servicio, borrando, onBorrar }: { servicio: ServicioPublico; borrando: boolean; onBorrar: () => void }) {
  const { tema } = useTema();
  const c = tema.colores;
  const [confirmar, setConfirmar] = useState(false);
  const estilo = estiloOficio(servicio.oficio);
  const tono = colorIcono(estilo.color, tema.oscuro);
  const nombre = nombreServicio(servicio);

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <View style={estilos.fila}>
        <View style={[estilos.cuadro, { backgroundColor: tono.fondo }]}>
          <Icono nombre={estilo.icono} tamano={28} color={tono.icono} />
        </View>
        <View style={estilos.textos}>
          <Texto variante="etiqueta">{nombre}</Texto>
          <Texto variante="ayuda">{etiquetaOficio(servicio.oficio)}</Texto>
        </View>
      </View>
      <View style={estilos.insignias}>
        <Insignia tono="amarillo" icono="thumb-up-outline" texto={String(servicio.vistoBuenoTotal)} etiqueta={`${servicio.vistoBuenoTotal} vistos buenos`} />
        {!servicio.contacto ? <Insignia tono="gris" texto="Sin celular" /> : null}
      </View>

      {confirmar ? (
        <>
          <Mensaje tono="aviso">{`¿Borrar ${nombre}? No se puede deshacer.`}</Mensaje>
          <View style={estilos.botones}>
            <BotonPrincipal variante="neutro" onPress={() => setConfirmar(false)} estilo={estilos.boton}>
              No
            </BotonPrincipal>
            <BotonPrincipal variante="emergencia" icono="trash-can-outline" cargando={borrando} onPress={onBorrar} estilo={estilos.boton}>
              Sí, borrar
            </BotonPrincipal>
          </View>
        </>
      ) : (
        <View style={estilos.botones}>
          <BotonPrincipal variante="secundario" icono="pencil-outline" estilo={estilos.boton} onPress={() => router.push({ pathname: "/servicios/publicar", params: { id: servicio.id } })}>
            Cambiar
          </BotonPrincipal>
          <BotonPrincipal variante="neutro" icono="trash-can-outline" estilo={estilos.boton} onPress={() => setConfirmar(true)}>
            Borrar
          </BotonPrincipal>
        </View>
      )}
      <BotonPrincipal variante="secundario" icono="storefront-outline" onPress={() => router.push({ pathname: "/servicios/[id]", params: { id: servicio.id } })}>
        Ver como mis vecinos
      </BotonPrincipal>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1.5, borderRadius: RADIO.l, padding: 14, gap: 10 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12 },
  cuadro: { width: 60, height: 60, borderRadius: RADIO.m, alignItems: "center", justifyContent: "center" },
  textos: { flex: 1 },
  insignias: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  botones: { flexDirection: "row", gap: 10 },
  boton: { flex: 1 },
});
