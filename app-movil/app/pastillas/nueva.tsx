/**
 * Vista. C2 · Nueva pastilla (Mockup v4, p. 13).
 * «Dímelo con tu voz» completa los campos (sin internet, ver interpretarPastilla.ts).
 * ¿Qué pastilla? · ¿Cuántas? (− / +, en medios) · ¿A qué hora? (Mañana/Tarde/Noche + − / + de 30 min)
 * · Te aviso con: Sonido, Voz, Vibración. «Guardar» programa el aviso diario y vuelve a C1.
 */
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { guardarPastillaConAviso, prepararAvisos } from "../../src/controladores/recordatorios";
import { useVoz } from "../../src/controladores/useVoz";
import { interpretarPastilla } from "../../src/modelos/interpretarPastilla";
import {
  cantidadLegible,
  franjaDe,
  HORA_POR_FRANJA,
  horaDesdeMinutos,
  horaLegible,
  minutosDe,
  nuevoId,
  type AvisoPastilla,
  type Franja,
} from "../../src/modelos/local/pastillas";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { Contador } from "../../src/vistas/componentes/Contador";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Opciones } from "../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { TarjetaAcceso } from "../../src/vistas/componentes/TarjetaAcceso";
import { Texto } from "../../src/vistas/componentes/Texto";
import { RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

const FRANJAS: { valor: Franja; etiqueta: string }[] = [
  { valor: "manana", etiqueta: "Mañana" },
  { valor: "tarde", etiqueta: "Tarde" },
  { valor: "noche", etiqueta: "Noche" },
];

const AVISOS: { clave: keyof AvisoPastilla; etiqueta: string }[] = [
  { clave: "sonido", etiqueta: "Sonido" },
  { clave: "voz", etiqueta: "Voz" },
  { clave: "vibracion", etiqueta: "Vibración" },
];

export default function NuevaPastilla() {
  const { tema } = useTema();
  const c = tema.colores;
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [hora, setHora] = useState(HORA_POR_FRANJA.tarde);
  const [aviso, setAviso] = useState<AvisoPastilla>({ sonido: true, voz: true, vibracion: true });
  const [mensaje, setMensaje] = useState<{ tono: "info" | "aviso"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const alDictar = useCallback((texto: string) => {
    const r = interpretarPastilla(texto);
    if (r.nombre) setNombre(r.nombre.slice(0, 60));
    if (r.cantidad) setCantidad(r.cantidad);
    if (r.hora) setHora(r.hora);
    const faltan = [!r.nombre && "cuál", !r.cantidad && "cuántas", !r.hora && "a qué hora"].filter(Boolean);
    setMensaje(
      faltan.length === 0
        ? { tono: "info", texto: "Revisa los datos y toca Guardar." }
        : { tono: "aviso", texto: `No entendí ${faltan.join(" ni ")}. Complétalo abajo.` },
    );
  }, []);
  const voz = useVoz(alDictar);

  const valido = nombre.trim().length >= 2;

  const guardar = async () => {
    setGuardando(true);
    const permiso = await prepararAvisos();
    await guardarPastillaConAviso({ id: nuevoId(), nombre: nombre.trim(), cantidad, hora, aviso });
    setGuardando(false);
    if (permiso === "denegado") {
      setMensaje({ tono: "aviso", texto: "Guardada, pero sin permiso de avisos. Actívalo en los ajustes del teléfono." });
      setTimeout(() => router.back(), 2500);
      return;
    }
    router.back();
  };

  return (
    <Pantalla
      titulo="Nueva pastilla"
      volver
      textoEscuchar="Nueva pastilla. Toca Dímelo con tu voz y di cuál, cuántas y a qué hora. O completa: qué pastilla, cuántas, a qué hora y cómo te aviso."
      pie={
        <BotonPrincipal
          variante="listo"
          icono="check"
          cargando={guardando}
          motivoDesactivado={valido ? null : "Falta el nombre de la pastilla"}
          onPress={() => void guardar()}
        >
          Guardar
        </BotonPrincipal>
      }
    >
      <TarjetaAcceso
        tono="tocarSuave"
        icono="microphone"
        titulo={voz.escuchando ? "Te escucho…" : "Dímelo con tu voz"}
        subtitulo="Di: cuál, cuántas y a qué hora"
        accion="ninguna"
        onPress={() => {
          setMensaje(null);
          if (!voz.disponible) {
            setMensaje({ tono: "aviso", texto: "Aquí no hay micrófono. Completa los datos abajo." });
            return;
          }
          void voz.alternar();
        }}
      />
      {mensaje ? <Mensaje tono={mensaje.tono}>{mensaje.texto}</Mensaje> : null}

      <CampoConVoz etiqueta="¿Qué pastilla?" ayuda="De la presión" valor={nombre} onCambiar={setNombre} maxLength={60} completo={valido} />

      <Texto variante="etiqueta">¿Cuántas?</Texto>
      <Contador
        nombre="Cantidad"
        valor={cantidadLegible(cantidad)}
        onMenos={() => setCantidad((n) => Math.max(0.5, n - 0.5))}
        onMas={() => setCantidad((n) => Math.min(10, n + 0.5))}
        puedeMenos={cantidad > 0.5}
        puedeMas={cantidad < 10}
      />

      <Texto variante="etiqueta">¿A qué hora?</Texto>
      <Opciones
        nombre="¿A qué hora?"
        opciones={FRANJAS}
        seleccion={[franjaDe(hora)]}
        onCambiar={(sel) => sel[0] && setHora(HORA_POR_FRANJA[sel[0]])}
      />
      <Contador
        nombre="Hora"
        valor={horaLegible(hora)}
        onMenos={() => setHora((h) => horaDesdeMinutos(minutosDe(h) - 30))}
        onMas={() => setHora((h) => horaDesdeMinutos(minutosDe(h) + 30))}
      />

      <View style={estilos.avisos}>
        <Texto variante="etiqueta">Te aviso con:</Texto>
        {AVISOS.map(({ clave, etiqueta }) => {
          const activo = aviso[clave];
          return (
            <Pressable
              key={clave}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: activo }}
              accessibilityLabel={etiqueta}
              onPress={() => setAviso((a) => ({ ...a, [clave]: !a[clave] }))}
              style={[
                estilos.chip,
                { backgroundColor: activo ? c.aviso : c.superficie, borderColor: activo ? c.avisoBorde : c.borde },
              ]}
            >
              <Texto variante="etiqueta" color={activo ? c.avisoTexto : c.textoSecundario}>{etiqueta}</Texto>
            </Pressable>
          );
        })}
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  avisos: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  chip: { minHeight: 48, paddingHorizontal: 14, borderRadius: RADIO.pastilla, borderWidth: 2, justifyContent: "center" },
});
