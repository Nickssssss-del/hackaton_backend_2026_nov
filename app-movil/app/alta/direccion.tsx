/**
 * Vista. A3.1 · Tu dirección · Paso 1 de 3 (Mockup v4, p. 4).
 * Calle o avenida, Número y Referencia, cada uno con micrófono.
 * «Seguir» queda desactivado mostrando cuántos datos faltan («Falta 1 dato»).
 * «Omitir» continúa sin dirección. Todo se guarda solo en el teléfono. Si el GPS no dejó zona,
 * se pasa a A3.2 «¿Cuál es tu barrio?» (lista de la tabla zonas) antes de A4.
 * En modo edición (Mis datos) hay además «Usar mi ubicación actual»: vuelve a tomar el GPS,
 * actualiza el barrio y propone la calle y el número (por si la persona se mudó).
 */
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  datosFaltantesDireccion,
  guardarDireccion,
  leerPerfil,
  omitirDireccion,
  rutaTrasDireccion,
  ubicarDomicilio,
} from "../../src/controladores/registroVecinos";
import type { DireccionLocal } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { IndicadorPasos } from "../../src/vistas/componentes/IndicadorPasos";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";

const VACIA: DireccionLocal = { calle: "", numero: "", referencia: "" };

export default function TuDireccion() {
  const params = useLocalSearchParams<{ calle?: string; numero?: string; desdeGps?: string; editar?: string }>();
  // Desde Mis datos (B3) se reutiliza esta pantalla para editar (INC-29).
  const editando = params.editar === "1";
  const [direccion, setDireccion] = useState<DireccionLocal>(VACIA);
  const [ubicando, setUbicando] = useState(false);
  const [avisoGps, setAvisoGps] = useState<{ tono: "info" | "aviso"; texto: string } | null>(null);

  const usarUbicacionActual = async () => {
    setAvisoGps(null);
    setUbicando(true);
    const r = await ubicarDomicilio();
    setUbicando(false);
    if (r.estado !== "ok") {
      setAvisoGps({
        tono: "aviso",
        texto: r.estado === "denegado" ? "Sin permiso de ubicación. Actívalo en los ajustes del teléfono." : "No encontré señal. Intenta junto a una ventana.",
      });
      return;
    }
    setDireccion((d) => ({ ...d, calle: r.calle || d.calle, numero: r.numero || d.numero }));
    setAvisoGps({ tono: "info", texto: "Ubicación actualizada. Revisa la calle y el número, y toca Guardar." });
  };

  useEffect(() => {
    let activo = true;
    void leerPerfil().then((perfil) => {
      if (!activo) return;
      const guardada = perfil.direccion ?? VACIA;
      setDireccion({
        calle: params.calle || guardada.calle,
        numero: params.numero || guardada.numero,
        referencia: guardada.referencia,
      });
    });
    return () => {
      activo = false;
    };
  }, [params.calle, params.numero]);

  const faltan = datosFaltantesDireccion(direccion);
  const cambiar = (campo: keyof DireccionLocal) => (texto: string) =>
    setDireccion((anterior) => ({ ...anterior, [campo]: texto }));

  const seguir = async () => {
    await guardarDireccion(direccion);
    if (editando) router.back();
    else router.push(await rutaTrasDireccion());
  };
  const omitir = async () => {
    await omitirDireccion();
    // Sin zona no hay Servicios, Comunidad ni Ayuda: si el GPS no la dejó, se elige de la lista.
    router.push(await rutaTrasDireccion());
  };

  return (
    <Pantalla
      titulo={editando ? "Mi dirección" : "Tu dirección"}
      volver
      encabezado={editando ? undefined : <IndicadorPasos paso={1} />}
      textoEscuchar={`${editando ? "Mi dirección" : "Paso 1 de 3. Tu dirección"}. Di o escribe la calle o avenida, el número y una referencia.`}
      pie={
        editando ? (
          <BotonPrincipal
            variante="listo"
            icono="check"
            motivoDesactivado={faltan > 0 ? `Falta ${faltan} ${faltan === 1 ? "dato" : "datos"}` : null}
            onPress={() => void seguir()}
          >
            Guardar
          </BotonPrincipal>
        ) : (
        <View style={estilos.fila}>
          <BotonPrincipal variante="neutro" estilo={estilos.omitir} onPress={() => void omitir()}>
            Omitir
          </BotonPrincipal>
          <BotonPrincipal
            estilo={estilos.seguir}
            motivoDesactivado={faltan > 0 ? `Falta ${faltan} ${faltan === 1 ? "dato" : "datos"}` : null}
            onPress={() => void seguir()}
          >
            Seguir
          </BotonPrincipal>
        </View>
        )
      }
    >
      {params.desdeGps ? <Mensaje tono="info">¿Vives aquí? Revisa y corrige si hace falta.</Mensaje> : null}
      {editando ? (
        <BotonPrincipal variante="secundario" icono="crosshairs-gps" cargando={ubicando} onPress={() => void usarUbicacionActual()}>
          Usar mi ubicación actual
        </BotonPrincipal>
      ) : null}
      {avisoGps ? <Mensaje tono={avisoGps.tono}>{avisoGps.texto}</Mensaje> : null}
      <CampoConVoz
        etiqueta="Calle o avenida"
        ayuda="Av. Los Maestros"
        valor={direccion.calle}
        onCambiar={cambiar("calle")}
        maxLength={80}
        completo={direccion.calle.trim().length > 0}
      />
      <CampoConVoz
        etiqueta="Número"
        ayuda="245"
        valor={direccion.numero}
        onCambiar={cambiar("numero")}
        maxLength={10}
        completo={direccion.numero.trim().length > 0}
      />
      <CampoConVoz
        etiqueta="Referencia"
        ayuda="Frente a la iglesia"
        valor={direccion.referencia}
        onCambiar={cambiar("referencia")}
        maxLength={80}
        completo={direccion.referencia.trim().length > 0}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", gap: 10 },
  omitir: { flex: 1 },
  seguir: { flex: 2 },
});
