/**
 * Vista. E4 · Sube tu negocio (Mockup v4, p. 19). Con `id`, cambia un negocio propio.
 * - Tipo: Bodega, Panadería, Gasfitero, Menú, Farmacia u Otro (Otro abre la lista de oficios).
 * - Nombre con voz o teclado.
 * - Agregar foto: tomarla o elegirla (expo-image-picker), comprimida, y subirla al bucket `fotos`
 *   (<zona>/<usuario>/<archivo>). Si la foto falla, el negocio se publica igual y se avisa.
 * - «Mis vecinos pueden verlo» es servicios.visible_vecinos (script 07). En No el negocio se guarda
 *   pero solo lo ve su dueño; se puede activar después en Mis servicios.
 * - Más datos (opcional): horario (abre y cierra, para «Abierto/Cerrado»), precio desde y descripción.
 * El celular se pide recién al publicar (D-03).
 */
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { faltaParaEscribir } from "../../src/controladores/useAyudaVecinos";
import { useFotoNueva } from "../../src/controladores/useFotoNueva";
import { useServicios } from "../../src/controladores/useServicios";
import { usePublicarNegocio, validarNombreNegocio } from "../../src/controladores/useServiciosV4";
import { ETIQUETA_OFICIO, OTROS_OFICIOS, TIPOS_NEGOCIO_V4 } from "../../src/modelos/categoriasServicio";
import { horaDesdeMinutos, horaLegible, minutosDe } from "../../src/modelos/local/pastillas";
import type { Oficio } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { Contador } from "../../src/vistas/componentes/Contador";
import { ElegirFoto } from "../../src/vistas/componentes/ElegirFoto";
import { estiloOficio } from "../../src/vistas/componentes/estiloCategoriaServicio";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Ilustracion } from "../../src/vistas/componentes/Ilustracion";
import { InterruptorSiNo } from "../../src/vistas/componentes/InterruptorSiNo";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Opciones } from "../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { colorIcono, RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

type Tipo = Oficio | "mas";

const ES_TIPO_PRINCIPAL = (o: string) => TIPOS_NEGOCIO_V4.some((t) => t.valor === o);

export default function SubeTuNegocio() {
  const { tema } = useTema();
  const c = tema.colores;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editando = Boolean(id);
  const servicios = useServicios();
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [otroOficio, setOtroOficio] = useState<Oficio | null>(null);
  const [nombre, setNombre] = useState("");
  const [acepta, setAcepta] = useState(true);
  const [conHorario, setConHorario] = useState(false);
  const [abre, setAbre] = useState("08:00");
  const [cierra, setCierra] = useState("20:00");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const fotoNueva = useFotoNueva();
  const [fotoActual, setFotoActual] = useState<string | undefined>(undefined);
  const [aviso, setAviso] = useState<string | null>(null);
  const negocio = usePublicarNegocio();
  const esperaCelular = useRef(false);
  const cargado = useRef(false);

  // Al cambiar un negocio propio, se llena con lo publicado (una sola vez).
  useEffect(() => {
    if (!id || cargado.current) return;
    const mio = servicios.todos.find((s) => s.id === id && s.esMio);
    if (!mio) return;
    cargado.current = true;
    const oficio = mio.oficio as Oficio;
    if (ES_TIPO_PRINCIPAL(oficio)) setTipo(oficio);
    else {
      setTipo("mas");
      setOtroOficio(oficio);
    }
    setNombre(mio.nombreNegocio ?? "");
    setAcepta(mio.visibleVecinos);
    if (mio.horaApertura && mio.horaCierre) {
      setConHorario(true);
      setAbre(mio.horaApertura.slice(0, 5));
      setCierra(mio.horaCierre.slice(0, 5));
    }
    setPrecio(mio.precioDesde !== undefined ? String(mio.precioDesde) : "");
    setDescripcion(mio.descripcion ?? "");
    setFotoActual(mio.fotoPath);
  }, [id, servicios.todos]);

  const oficio: Oficio | null = tipo === "mas" ? otroOficio : tipo;

  const publicar = useCallback(async () => {
    if (!oficio) return;
    setAviso(null);
    const falta = await faltaParaEscribir();
    if (falta === "celular") {
      esperaCelular.current = true;
      router.push("/perfil/celular");
      return;
    }
    if (falta === "registro") {
      setAviso("Primero marca dónde vives: Mis datos › Mi dirección.");
      return;
    }
    const precioNumero = precio.trim() ? Number(precio.replace(",", ".")) : null;
    try {
      await negocio.publicar({
        id,
        oficio,
        nombre,
        visible: acepta,
        horario: conHorario ? { abre, cierra } : null,
        precioDesde: precioNumero,
        descripcion,
        subirFoto: fotoNueva.foto ? fotoNueva.subir : undefined,
      });
    } catch {
      // El mensaje se muestra con negocio.error.
    }
  }, [id, oficio, nombre, negocio, acepta, conHorario, abre, cierra, precio, descripcion, fotoNueva.foto, fotoNueva.subir]);

  const publicarRef = useRef(publicar);
  publicarRef.current = publicar;

  useFocusEffect(
    useCallback(() => {
      if (!esperaCelular.current) return;
      esperaCelular.current = false;
      void faltaParaEscribir().then((falta) => {
        if (falta === null) void publicarRef.current();
      });
    }, []),
  );

  if (negocio.hecho) {
    return (
      <Pantalla
        titulo={editando ? "¡Cambios guardados!" : "¡Tu negocio ya está publicado!"}
        textoEscuchar={editando ? "Cambios guardados." : "Tu negocio ya está publicado. Tus vecinos lo verán en Servicios."}
        pie={
          <>
            <BotonPrincipal variante="tocar" icono="storefront-outline" onPress={() => router.replace("/servicios/mios")}>
              Ver mis servicios
            </BotonPrincipal>
            <BotonPrincipal variante="secundario" icono="home-outline" onPress={() => router.dismissTo("/principal")}>
              Volver al inicio
            </BotonPrincipal>
          </>
        }
      >
        <Ilustracion tipo="listo" />
        {negocio.avisoFoto ? <Mensaje tono="aviso">{`${negocio.avisoFoto} Puedes agregarla después en Mis servicios.`}</Mensaje> : null}
        <Mensaje tono="listo">
          {acepta ? `${nombre.trim()} ya aparece en Servicios.` : `${nombre.trim()} quedó guardado. Solo tú lo ves hasta que actives «Mis vecinos pueden verlo».`}
        </Mensaje>
        <Texto>Nunca pidas dinero ni claves por adelantado.</Texto>
      </Pantalla>
    );
  }

  const problemaNombre = validarNombreNegocio(nombre);
  const motivo = !oficio
    ? tipo === "mas"
      ? "Falta elegir cuál"
      : "Falta el tipo"
    : problemaNombre
      ? problemaNombre
      : precio.trim() && !Number.isFinite(Number(precio.replace(",", ".")))
        ? "Revisa el precio"
        : null;

  return (
    <Pantalla
      titulo={editando ? "Cambiar mi negocio" : "Sube tu negocio"}
      volver
      textoEscuchar="Sube tu negocio. Elige el tipo: bodega, panadería, gasfitero, menú, farmacia u otro. Di o escribe el nombre. Si quieres, agrega tu horario, desde qué precio y una descripción. Luego toca Publicar."
      pie={
        <BotonPrincipal variante="listo" icono="check" cargando={negocio.enviando} motivoDesactivado={motivo} onPress={() => void publicar()}>
          {editando ? "Guardar cambios" : "Publicar"}
        </BotonPrincipal>
      }
    >
      <View style={estilos.rejilla} accessibilityRole="radiogroup" accessibilityLabel="Tipo de negocio">
        {TIPOS_NEGOCIO_V4.map((t) => {
          const activo = tipo === t.valor;
          const estilo = t.valor === "mas" ? { icono: "plus" as const, color: "azul" as const } : estiloOficio(t.valor);
          const tono = colorIcono(estilo.color, tema.oscuro);
          return (
            <Pressable
              key={t.valor}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={t.etiqueta}
              onPress={() => {
                negocio.reiniciar();
                setTipo(t.valor);
              }}
              style={({ pressed }) => [
                estilos.tipo,
                {
                  backgroundColor: activo ? c.accionSuave : c.superficie,
                  borderColor: activo ? c.accion : c.borde,
                  borderWidth: activo ? 3 : 1.5,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Icono nombre={estilo.icono} tamano={28} color={tono.icono} />
              <Texto variante="etiqueta" centrado color={activo ? c.accionTexto : c.texto}>{t.etiqueta}</Texto>
            </Pressable>
          );
        })}
      </View>

      {tipo === "mas" ? (
        <>
          <Texto variante="etiqueta">¿Cuál?</Texto>
          <Opciones
            nombre="¿Cuál oficio?"
            columnas={2}
            opciones={OTROS_OFICIOS.map((o) => ({ valor: o, etiqueta: ETIQUETA_OFICIO[o] }))}
            seleccion={otroOficio ? [otroOficio] : []}
            onCambiar={(sel) => setOtroOficio(sel[0] ?? null)}
          />
        </>
      ) : null}

      <CampoConVoz
        etiqueta="Nombre"
        ayuda="Panadería San José"
        valor={nombre}
        onCambiar={(t) => {
          negocio.reiniciar();
          setNombre(t);
        }}
        maxLength={60}
        completo={problemaNombre === null}
      />

      <Texto variante="etiqueta">Foto (si quieres)</Texto>
      <ElegirFoto estado={fotoNueva} rutaActual={fotoActual} descripcion={`Foto de ${nombre.trim() || "tu negocio"}`} />

      <Texto variante="subtitulo">Más datos (si quieres)</Texto>
      <InterruptorSiNo etiqueta="Tiene horario fijo" valor={conHorario} onCambiar={setConHorario} />
      {conHorario ? (
        <>
          <Texto variante="etiqueta">Abre</Texto>
          <Contador
            nombre="Hora en que abre"
            valor={horaLegible(abre)}
            puedeMenos={minutosDe(abre) > 0}
            puedeMas={minutosDe(abre) < minutosDe(cierra) - 30}
            onMenos={() => setAbre(horaDesdeMinutos(Math.max(0, minutosDe(abre) - 30)))}
            onMas={() => setAbre(horaDesdeMinutos(minutosDe(abre) + 30))}
          />
          <Texto variante="etiqueta">Cierra</Texto>
          <Contador
            nombre="Hora en que cierra"
            valor={horaLegible(cierra)}
            puedeMenos={minutosDe(cierra) > minutosDe(abre) + 30}
            puedeMas={minutosDe(cierra) < 23 * 60 + 30}
            onMenos={() => setCierra(horaDesdeMinutos(minutosDe(cierra) - 30))}
            onMas={() => setCierra(horaDesdeMinutos(Math.min(23 * 60 + 30, minutosDe(cierra) + 30)))}
          />
          <Texto variante="ayuda">Así tus vecinos sabrán si está abierto.</Texto>
        </>
      ) : null}
      <CampoConVoz
        etiqueta="Desde qué precio (soles)"
        ayuda="10"
        valor={precio}
        onCambiar={(t) => setPrecio(t.replace(/[^\d.,]/g, ""))}
        maxLength={9}
        teclado="decimal-pad"
        sinVoz
      />
      <CampoConVoz
        etiqueta="Descripción"
        ayuda="Pan fresco desde las 6 de la mañana"
        valor={descripcion}
        onCambiar={setDescripcion}
        maxLength={140}
      />

      <InterruptorSiNo etiqueta="Mis vecinos pueden verlo" valor={acepta} onCambiar={setAcepta} />
      <Texto variante="ayuda">
        {acepta ? "Verán el nombre y tu celular para llamarte." : "Se guardará, pero solo tú lo verás. Puedes mostrarlo después."}
      </Texto>

      {aviso ? <Mensaje tono="aviso">{aviso}</Mensaje> : null}
      {negocio.error ? <Mensaje tono="aviso">{negocio.error}</Mensaje> : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  rejilla: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tipo: {
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 92,
    borderRadius: RADIO.m,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
});
