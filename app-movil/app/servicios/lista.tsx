/**
 * Vista. E2 · Lista de una categoría (Mockup v4, p. 17; p. ej. «Panaderías»).
 * Parámetros: `categoria` (E1), `cerca=1` («Cerca de ti») o `texto` (lo dicho en «Decir qué busco»).
 * Cada tarjeta: ícono, nombre, minutos a pie, Abierto/Cerrado y vistos buenos → E3.
 * Orden: más recomendados primero (como antes); en «Cerca de ti», por minutos a pie.
 * Pie: «Ver en el mapa» abre Google Maps con la categoría alrededor de la ubicación guardada.
 */
import { router, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { sinBase } from "../../src/controladores/useAyudaVecinos";
import { useServicios } from "../../src/controladores/useServicios";
import { textoMinutos, urlMapaCategoria } from "../../src/controladores/useServiciosV4";
import { categoriaServicio, etiquetaOficio, nombreServicio } from "../../src/modelos/categoriasServicio";
import type { ServicioPublico } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { estiloOficio } from "../../src/vistas/componentes/estiloCategoriaServicio";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Insignia } from "../../src/vistas/componentes/Insignia";
import { usePerfil } from "../../src/controladores/usePerfil";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { colorIcono, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

type ServicioConMinutos = ServicioPublico & { _minutos?: number };

/** Sin ubicación no se puede medir; «Cerca de ti» muestra hasta 30 min a pie. */
const MAX_MINUTOS_CERCA = 30;

export default function ListaServicios() {
  const params = useLocalSearchParams<{ categoria?: string; cerca?: string; texto?: string }>();
  const categoria = categoriaServicio(params.categoria);
  const cerca = params.cerca === "1";
  const texto = params.texto?.trim().toLowerCase() ?? "";
  const servicios = useServicios();
  const { perfil } = usePerfil();
  const faltaServidor = sinBase();

  let lista: ServicioConMinutos[] = servicios.servicios;
  if (categoria) {
    lista = lista.filter((s) => (categoria.oficios as readonly string[]).includes(s.oficio));
  } else if (texto) {
    lista = lista.filter((s) =>
      `${nombreServicio(s)} ${etiquetaOficio(s.oficio)} ${s.descripcion}`.toLowerCase().includes(texto),
    );
  } else if (cerca && servicios.ubicacion) {
    lista = lista
      .filter((s) => s._minutos !== undefined && s._minutos <= MAX_MINUTOS_CERCA)
      .sort((a, b) => (a._minutos ?? 0) - (b._minutos ?? 0));
  }

  const titulo = categoria?.etiqueta ?? (cerca ? "Cerca de ti" : params.texto ? `«${params.texto.trim()}»` : "Servicios");
  const busquedaMapa = categoria?.etiqueta ?? (params.texto?.trim() || "negocios");

  const textoEscuchar = [
    titulo,
    lista.length === 0
      ? "No encontramos negocios."
      : lista
          .slice(0, 5)
          .map((s) => {
            const minutos = textoMinutos(s._minutos);
            return `${nombreServicio(s)}${minutos ? `, a ${minutos} a pie` : ""}${s.horaApertura ? (s.abiertoAhora ? ", abierto" : ", cerrado") : ""}`;
          })
          .join(". "),
    "Toca uno para ver más.",
  ].join(". ");

  return (
    <Pantalla
      titulo={titulo}
      volver
      textoEscuchar={textoEscuchar}
      pie={
        <BotonPrincipal
          variante="secundario"
          icono="map-marker-outline"
          onPress={() => void Linking.openURL(urlMapaCategoria(busquedaMapa, servicios.ubicacion))}
        >
          Ver en el mapa
        </BotonPrincipal>
      }
    >
      {faltaServidor ? <Mensaje tono="aviso">{faltaServidor}</Mensaje> : null}
      {servicios.copiaFecha ? <Mensaje tono="info">{`Sin internet. Copia guardada del ${servicios.copiaFecha}.`}</Mensaje> : null}
      {cerca && !servicios.ubicacion ? (
        <Mensaje tono="info">Para saber qué está cerca, marca dónde vives en Mis datos › Mi dirección (con «Usar mi ubicación actual»).</Mensaje>
      ) : null}
      {servicios.error && !faltaServidor ? <Mensaje tono="aviso">{servicios.error}</Mensaje> : null}
      {servicios.cargando ? <Texto variante="ayuda">Buscando negocios de tu barrio…</Texto> : null}

      {!servicios.cargando && !servicios.error && !faltaServidor && lista.length === 0 ? (
        <>
          {perfil && !perfil.zonaId ? (
            <>
              <Mensaje tono="aviso">Para ver los negocios de tu barrio, primero elige tu barrio.</Mensaje>
              <BotonPrincipal variante="tocar" icono="home-city-outline" onPress={() => router.push({ pathname: "/alta/zona", params: { editar: "1" } })}>
                Elegir mi barrio
              </BotonPrincipal>
            </>
          ) : (
            <>
              <Mensaje tono="info">{categoria ? `Aún no hay ${categoria.etiqueta.toLowerCase()} en tu barrio.` : "No encontramos negocios."}</Mensaje>
              <BotonPrincipal variante="secundarioListo" icono="storefront-outline" onPress={() => router.push("/servicios/publicar")}>
                Sube tu negocio
              </BotonPrincipal>
            </>
          )}
        </>
      ) : null}

      {lista.map((s) => (
        <TarjetaNegocio key={s.id} servicio={s} />
      ))}
    </Pantalla>
  );
}

function TarjetaNegocio({ servicio }: { servicio: ServicioConMinutos }) {
  const { tema } = useTema();
  const c = tema.colores;
  const estilo = estiloOficio(servicio.oficio);
  const tono = colorIcono(estilo.color, tema.oscuro);
  const minutos = textoMinutos(servicio._minutos);
  const tieneHorario = Boolean(servicio.horaApertura && servicio.horaCierre);
  const nombre = nombreServicio(servicio);
  const etiqueta = [
    nombre,
    minutos ? `${minutos} a pie` : null,
    tieneHorario ? (servicio.abiertoAhora ? "Abierto" : "Cerrado") : null,
    `${servicio.vistoBuenoTotal} vistos buenos`,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={() => router.push({ pathname: "/servicios/[id]", params: { id: servicio.id } })}
      style={({ pressed }) => [estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={estilos.fila}>
        <View style={[estilos.cuadro, { backgroundColor: tono.fondo }]}>
          <Icono nombre={estilo.icono} tamano={28} color={tono.icono} />
        </View>
        <Texto variante="etiqueta" style={estilos.nombre}>{nombre}</Texto>
        <Icono nombre="chevron-right" tamano={28} color={c.accionTexto} />
      </View>
      <View style={estilos.insignias} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {minutos ? <Insignia tono="azul" icono="walk" texto={minutos} /> : null}
        {tieneHorario ? <Insignia tono={servicio.abiertoAhora ? "verde" : "gris"} texto={servicio.abiertoAhora ? "Abierto" : "Cerrado"} /> : null}
        <Insignia tono="amarillo" icono="thumb-up-outline" texto={String(servicio.vistoBuenoTotal)} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1.5, borderRadius: RADIO.l, padding: 14, gap: 10 },
  fila: { flexDirection: "row", alignItems: "center", gap: 12 },
  cuadro: { width: 60, height: 60, borderRadius: RADIO.m, alignItems: "center", justifyContent: "center" },
  nombre: { flex: 1 },
  insignias: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
