/**
 * Vista. Más opciones de Mis datos (se llega desde B3 › «Más opciones»).
 * Rediseñada con los componentes del Mockup v4: el tamaño de letra y el modo oscuro ya están en
 * la barra de arriba (Aa y luna) y en B3, así que aquí no se repiten.
 * - Mi perfil: nombre, celular y el NOMBRE del barrio (nunca el código interno de la base).
 * - A quién avisamos: tus 2 personas (se cambian en A5, con Cambiar/Quitar) y la brigada.
 * - Mi ficha, Mis servicios, Mis pedidos, tutorial y Borrar mis datos.
 * Contactos, ficha y consentimiento solo en el teléfono.
 */
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { usePreferencias } from "../../src/controladores/PreferenciasContexto";
import { useBorrarMisDatos } from "../../src/controladores/useBorrarMisDatos";
import { useGruposCercanos } from "../../src/controladores/useGruposCercanos";
import { usePerfil } from "../../src/controladores/usePerfil";
import { useZona } from "../../src/controladores/useZona";
import { leerContactosLocales } from "../../src/modelos/local/contactos";
import { leerFicha } from "../../src/modelos/local/ficha";
import { leerPerfilLocal } from "../../src/modelos/local/perfil";
import type { ContactoLocal, PerfilLocal } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { InterruptorSiNo } from "../../src/vistas/componentes/InterruptorSiNo";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { TarjetaAcceso } from "../../src/vistas/componentes/TarjetaAcceso";
import { Texto } from "../../src/vistas/componentes/Texto";
import { RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

const telefonoLegible = (t: string) => t.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");

export default function MasOpciones() {
  const { tema } = useTema();
  const c = tema.colores;
  const { sonidos, setSonidos } = usePreferencias();
  const { perfil: perfilHook } = usePerfil();
  const { zonas } = useZona();
  const grupos = useGruposCercanos();
  const { borrar, borrando } = useBorrarMisDatos();
  const [perfil, setPerfil] = useState<PerfilLocal | null>(null);
  const [contactos, setContactos] = useState<ContactoLocal[]>([]);
  const [ficha, setFicha] = useState<{ mensaje: string; aceptado?: boolean }>({ mensaje: "" });

  // Se relee al volver de editar (perfil, contactos o ficha).
  useFocusEffect(
    useCallback(() => {
      void Promise.all([leerPerfilLocal(), leerContactosLocales(), leerFicha()]).then(([p, cs, f]) => {
        setPerfil(p);
        setContactos(cs);
        setFicha({ mensaje: f.mensaje, aceptado: f.consentimiento?.aceptado });
      });
    }, []),
  );

  const datos = perfil ?? perfilHook;
  const zona = zonas.find((z) => z.id === datos?.zonaId);
  const barrio = zona
    ? zona.distrito && zona.distrito !== zona.nombre
      ? `${zona.nombre} (${zona.distrito})`
      : zona.nombre
    : datos?.zonaId
      ? "Guardado (sin internet no veo el nombre)"
      : "Aún no eliges tu barrio";
  const brigada = grupos.find((g) => g.tipo === "brigada");

  return (
    <Pantalla
      titulo="Más opciones"
      volver
      textoEscuchar={`Más opciones. Tu nombre es ${datos?.nombre ?? "sin nombre"}. Tu barrio: ${barrio}. Aquí puedes cambiar tu perfil, a quién avisamos y tu ficha de emergencia.`}
    >
      <Mensaje tono="info">Tus contactos, ficha y consentimiento solo están en tu teléfono.</Mensaje>

      <InterruptorSiNo etiqueta="Leer en voz alta" valor={sonidos} onCambiar={setSonidos} />

      <Seccion titulo="Mi perfil" accion="Cambiar mi perfil" onPress={() => router.push("/mis-datos/perfil")}>
        <Dato etiqueta="Nombre" valor={datos?.nombre?.trim() || "Sin nombre"} />
        <Dato etiqueta="Celular" valor={datos?.celular ? telefonoLegible(datos.celular) : "Aún no lo pones"} />
        <Dato etiqueta="Barrio" valor={barrio} />
      </Seccion>

      <Seccion
        titulo="A quién avisamos"
        accion="Cambiar mis contactos"
        onPress={() => router.push({ pathname: "/alta/contactos", params: { editar: "1" } })}
      >
        {contactos.length === 0 ? <Texto color={c.textoSecundario}>Aún no eliges a nadie.</Texto> : null}
        {contactos.map((x, i) => (
          <Dato
            key={x.telefono}
            etiqueta={`${i + 1}. ${x.nombre}${x.relacion ? `, ${x.relacion}` : ""}`}
            valor={telefonoLegible(x.telefono)}
          />
        ))}
        {brigada ? (
          <Dato
            etiqueta="Brigada de tu barrio"
            valor={`${brigada.nombre}${brigada.contacto ? ` · ${telefonoLegible(brigada.contacto)}` : ""}${brigada.verificada ? "" : " · sin verificar"}`}
          />
        ) : null}
      </Seccion>

      <Seccion titulo="Mi ficha de emergencia" accion="Cambiar mi ficha" onPress={() => router.push("/mis-datos/ficha")}>
        <Texto color={c.textoSecundario}>{ficha.mensaje.trim() || "Aún no escribes nada."}</Texto>
        <Dato
          etiqueta="¿Se puede compartir en una emergencia?"
          valor={ficha.aceptado === true ? "Sí" : ficha.aceptado === false ? "No" : "Aún no decides"}
        />
      </Seccion>

      <TarjetaAcceso icono="storefront-outline" colorIcono="turquesa" titulo="Mis servicios" onPress={() => router.push("/servicios/mios")} />
      <TarjetaAcceso icono="hand-heart-outline" colorIcono="morado" titulo="Mis pedidos de ayuda" onPress={() => router.push("/ayuda-vecinos/mis-pedidos")} />
      <TarjetaAcceso icono="school-outline" titulo="Ver el tutorial otra vez" onPress={() => router.push("/bienvenida/tutorial")} />

      <View style={estilos.borrar}>
        <BotonPrincipal variante="neutro" icono="delete-outline" cargando={borrando} onPress={() => void borrar()}>
          Borrar mis datos
        </BotonPrincipal>
      </View>
    </Pantalla>
  );
}

function Seccion({ titulo, accion, onPress, children }: { titulo: string; accion: string; onPress: () => void; children: React.ReactNode }) {
  const { tema } = useTema();
  const c = tema.colores;
  return (
    <View style={[estilos.seccion, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <Texto variante="subtitulo" accessibilityRole="header">{titulo}</Texto>
      {children}
      <BotonPrincipal variante="secundario" icono="pencil-outline" onPress={onPress}>
        {accion}
      </BotonPrincipal>
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const { tema } = useTema();
  return (
    <View>
      <Texto variante="etiqueta">{etiqueta}</Texto>
      <Texto color={tema.colores.textoSecundario}>{valor}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { borderWidth: 1.5, borderRadius: RADIO.l, padding: 14, gap: 10 },
  borrar: { marginTop: 16 },
});
