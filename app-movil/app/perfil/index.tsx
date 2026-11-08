/**
 * Vista. B3 · Mis datos (Mockup v4, p. 10). Ordenada en dos grupos para no saturar (pedido del equipo):
 * «Sobre mí» (datos personales, ¿Algo de esto te pasa?, contactos, dirección) y «Mi seguridad»
 * (caídas, salir de casa, vecinos me ven, confirmar celular). Lo demás va dentro de «Más ajustes».
 * Tamaño de letra (Normal, Grande, Enorme), interruptores Sí/No, filas Mi dirección, Mis contactos,
 * ¿Algo te pasa? y «Cambiar de modo». Todo se guarda al instante en el teléfono.
 * Mi dirección, Mis contactos y Cambiar de modo reutilizan A3.1, A5 y A2 en modo edición (INC-29).
 * «Más opciones» lleva a la pantalla anterior (perfil, ficha y borrar mis datos), que se conserva.
 * Además: Mis datos personales (nombre, edad, género → A4 en edición), Mi avatar y
 * «Cerrar sesión en este teléfono» (con confirmación; borra solo lo guardado en el teléfono).
 * «Vecinos cerca me ven si pido ayuda» se guarda también en perfiles.alerta_vecinal (script 07),
 * y «Confirmar mi celular» lleva a /perfil/verificar (lo exigen ayudar y las alertas vecinales).
 */
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { leerSituaciones } from "../../src/modelos/local/situaciones";
import { SITUACIONES } from "../../src/vistas/componentes/estiloSituaciones";
import { cerrarSesionLocal, leerContactos, leerPerfil } from "../../src/controladores/registroVecinos";
import { sincronizarAlertaVecinal, useEstadoCuenta } from "../../src/controladores/useCuenta";
import { activarAvisoSalida, desactivarAvisoSalida, mensajeSalida } from "../../src/controladores/salidaDeCasa";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferencias } from "../../src/controladores/PreferenciasContexto";
import type { TamanoLetra } from "../../src/modelos/local/preferencias";
import { InterruptorSiNo } from "../../src/vistas/componentes/InterruptorSiNo";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { TarjetaAcceso } from "../../src/vistas/componentes/TarjetaAcceso";
import { Texto } from "../../src/vistas/componentes/Texto";
import { RADIO, TAMANOS_LETRA } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

const ORDEN: TamanoLetra[] = ["normal", "grande", "enorme"];

export default function MisDatos() {
  const { tema } = useTema();
  const c = tema.colores;
  const prefs = usePreferencias();
  // Lo elegido en «¿Algo de esto te pasa?», en una línea: «Vivo solo · Oigo poco».
  const [textoSituaciones, setTextoSituaciones] = useState("Aún no eliges");
  // Lo guardado, a la vista en cada fila: «Rosa · 74 años · Mujer», «Ana · Jorge», «Jr. Lima 123».
  const [resumen, setResumen] = useState<{ personales: string; contactos: string; direccion: string }>({
    personales: "Nombre, edad y si eres mujer u hombre",
    contactos: "Las personas a quienes llamo",
    direccion: "Calle, número y ubicación",
  });
  useFocusEffect(
    useCallback(() => {
      void Promise.all([leerPerfil(), leerContactos()]).then(([perfil, contactos]) => {
        const personales = [
          perfil.nombre?.trim(),
          perfil.edad ? `${perfil.edad} años` : undefined,
          perfil.genero === "mujer" ? "Mujer" : perfil.genero === "hombre" ? "Hombre" : undefined,
        ].filter(Boolean).join(" · ");
        const nombres = contactos.map((x) => x.nombre.trim()).filter(Boolean).join(" · ");
        const d = perfil.direccion;
        const direccion = d?.calle ? `${d.calle}${d.numero ? ` ${d.numero}` : ""}` : "";
        setResumen({
          personales: personales || "Nombre, edad y si eres mujer u hombre",
          contactos: nombres || "Aún no tienes: agrega a quién llamar",
          direccion: direccion || "Aún no la pones",
        });
      });
      void leerSituaciones().then((lista) => {
        const nombres = SITUACIONES.filter((x) => lista.includes(x.valor)).map((x) => x.etiqueta);
        setTextoSituaciones(nombres.length > 0 ? nombres.join(" · ") : "Aún no eliges");
      });
    }, []),
  );
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [masAjustes, setMasAjustes] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const cuenta = useEstadoCuenta();
  const [avisoAlerta, setAvisoAlerta] = useState<string | null>(null);
  const [avisoSalida, setAvisoSalida] = useState<string | null>(null);

  const cambiarAvisoSalida = (activar: boolean) => {
    prefs.setAvisarAlSalir(activar);
    setAvisoSalida(null);
    if (!activar) {
      void desactivarAvisoSalida();
      return;
    }
    void activarAvisoSalida(true).then((r) => setAvisoSalida(mensajeSalida(r)));
  };

  const cambiarAlertaVecinal = (activar: boolean) => {
    prefs.setVisibleParaVecinos(activar);
    setAvisoAlerta(null);
    void sincronizarAlertaVecinal(activar).then((problema) => {
      if (problema) setAvisoAlerta(`Se guardó en tu teléfono. ${problema}`);
      else if (activar && !cuenta.celularVerificado) {
        setAvisoAlerta("Para recibir alertas de tus vecinos, también confirma tu celular.");
      }
    });
  };

  const salir = async () => {
    setSaliendo(true);
    await cerrarSesionLocal();
    setSaliendo(false);
    router.dismissAll();
    router.replace("/alta");
  };

  return (
    <Pantalla
      titulo="Mis datos"
      volver
      textoEscuchar={`Mis datos. Sobre mí: tus datos personales, lo que te pasa, tus contactos y tu dirección. Mi seguridad: detectar caídas, ${prefs.detectarCaidas ? "sí" : "no"}; avisar si salgo de casa, ${prefs.avisarAlSalir ? "sí" : "no"}; vecinos cerca me ven si pido ayuda, ${prefs.visibleParaVecinos ? "sí" : "no"}. En Más ajustes: letra, modo oscuro, avatar, barrio, modo y probar la emergencia.`}
    >
      <Texto variante="subtitulo" accessibilityRole="header">Sobre mí</Texto>
      <TarjetaAcceso
        icono="card-account-details-outline"
        titulo="Mis datos personales"
        subtitulo={resumen.personales}
        onPress={() => router.push({ pathname: "/alta/datos", params: { editar: "1" } })}
      />
      <TarjetaAcceso
        icono="hand-heart-outline"
        colorIcono="morado"
        titulo="¿Algo de esto te pasa?"
        subtitulo={textoSituaciones}
        onPress={() => router.push("/perfil/situaciones")}
      />
      <TarjetaAcceso
        icono="account-heart-outline"
        titulo="Mis contactos"
        subtitulo={resumen.contactos}
        onPress={() => router.push({ pathname: "/alta/contactos", params: { editar: "1" } })}
      />
      <TarjetaAcceso
        icono="home-outline"
        titulo="Mi dirección"
        subtitulo={resumen.direccion}
        onPress={() => router.push({ pathname: "/alta/direccion", params: { editar: "1" } })}
      />

      <Texto variante="subtitulo" accessibilityRole="header" style={estilos.seccion}>Mi seguridad</Texto>
      <InterruptorSiNo etiqueta="Detectar caídas" valor={prefs.detectarCaidas} onCambiar={prefs.setDetectarCaidas} />
      <InterruptorSiNo etiqueta="Avisar si salgo de casa" valor={prefs.avisarAlSalir} onCambiar={cambiarAvisoSalida} />
      {avisoSalida ? <Mensaje tono="aviso">{avisoSalida}</Mensaje> : null}
      <InterruptorSiNo
        etiqueta="Vecinos cerca me ven si pido ayuda"
        valor={prefs.visibleParaVecinos}
        onCambiar={cambiarAlertaVecinal}
      />
      {avisoAlerta ? <Mensaje tono="aviso">{avisoAlerta}</Mensaje> : null}
      <TarjetaAcceso
        icono={cuenta.celularVerificado ? "cellphone-check" : "cellphone-message"}
        colorIcono={cuenta.celularVerificado ? "verde" : "azul"}
        titulo={cuenta.celularVerificado ? "Celular confirmado" : "Confirmar mi celular"}
        subtitulo={cuenta.celularVerificado ? "Puedes ayudar y recibir alertas" : "Para ayudar y recibir alertas de vecinos"}
        onPress={() => router.push("/perfil/verificar")}
      />

      {/* Lo que se usa poco queda guardado aquí, para que Mis datos no se vea lleno. */}
      <BotonPrincipal variante="secundario" icono={masAjustes ? "chevron-up" : "chevron-down"} onPress={() => setMasAjustes((v) => !v)}>
        {masAjustes ? "Ocultar más ajustes" : "Más ajustes"}
      </BotonPrincipal>
      {masAjustes ? (
        <>
          <Texto variante="etiqueta">Tamaño de letra</Texto>
          <View style={estilos.tamanos} accessibilityRole="radiogroup" accessibilityLabel="Tamaño de letra">
            {ORDEN.map((t) => {
              const activo = prefs.tamano === t;
              const { etiqueta, base } = TAMANOS_LETRA[t];
              return (
                <Pressable
                  key={t}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={etiqueta}
                  onPress={() => prefs.setTamano(t)}
                  style={[
                    estilos.tamano,
                    {
                      backgroundColor: activo ? c.accion : c.superficie,
                      borderColor: activo ? c.accion : c.borde,
                    },
                  ]}
                >
                  <Texto
                    negrita
                    color={activo ? c.sobreColor : c.texto}
                    maxFontSizeMultiplier={1}
                    style={{ fontSize: base + 8, lineHeight: base + 14 }}
                  >
                    A
                  </Texto>
                  <Texto variante="etiqueta" color={activo ? c.sobreColor : c.texto} centrado>{etiqueta}</Texto>
                </Pressable>
              );
            })}
          </View>
          <InterruptorSiNo etiqueta="Modo oscuro" valor={prefs.oscuro} onCambiar={prefs.setOscuro} />
          <TarjetaAcceso
            icono="account-circle-outline"
            colorIcono="morado"
            titulo="Mi avatar"
            subtitulo="Elige tu dibujo del Inicio"
            onPress={() => router.push("/perfil/avatar")}
          />
          <TarjetaAcceso
            icono="home-city-outline"
            titulo="Mi barrio"
            subtitulo="Para ver servicios y vecinos"
            onPress={() => router.push({ pathname: "/alta/zona", params: { editar: "1" } })}
          />
          <TarjetaAcceso
            icono="swap-horizontal"
            titulo="Cambiar de modo"
            subtitulo={prefs.modo === "completo" ? "Ahora: Modo completo" : "Ahora: Modo sencillo"}
            onPress={() => router.push({ pathname: "/alta/modo", params: { editar: "1" } })}
          />
          <TarjetaAcceso
            icono="play-circle-outline"
            colorIcono="rojo"
            titulo="Probar la emergencia"
            subtitulo="Demo: no llama a nadie"
            onPress={() => router.push({ pathname: "/sos", params: { demo: "1" } })}
          />
          <TarjetaAcceso
            icono="dots-horizontal"
            titulo="Más opciones"
            subtitulo="Perfil, ficha y borrar mis datos"
            onPress={() => router.push("/mis-datos")}
          />
        </>
      ) : null}

      {confirmarSalida ? (
        <View style={[estilos.confirmar, { borderColor: c.peligro, backgroundColor: c.superficie }]}>
          <Texto variante="subtitulo">¿Cerrar sesión en este teléfono?</Texto>
          <Texto>
            Se borran de este teléfono tus datos, contactos, pastillas y dirección. Lo que publicaste en la nube se queda.
          </Texto>
          <BotonPrincipal variante="emergencia" icono="logout" cargando={saliendo} onPress={() => void salir()}>
            Sí, cerrar sesión
          </BotonPrincipal>
          <BotonPrincipal variante="neutro" onPress={() => setConfirmarSalida(false)}>
            No, quedarme
          </BotonPrincipal>
        </View>
      ) : (
        <BotonPrincipal variante="neutro" icono="logout" onPress={() => setConfirmarSalida(true)}>
          Cerrar sesión
        </BotonPrincipal>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  tamanos: { flexDirection: "row", gap: 8 },
  seccion: { marginTop: 8 },
  confirmar: { borderWidth: 2, borderRadius: RADIO.l, padding: 14, gap: 10 },
  tamano: {
    flex: 1,
    minHeight: 96,
    borderRadius: RADIO.m,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
