/**
 * Vista. «Comentar con mi voz» (pie de E3, Mockup v4 p. 18).
 * Desde el script 07 el comentario va a la tabla `comentarios` (140 letras, sin enlaces, hasta 10
 * por día) y se lee en la vista `comentarios_visibles`. Ya no depende del visto bueno: se puede
 * comentar más de una vez, y el visto bueno sigue siendo un toque en E3 (reemplaza la D-10 anterior).
 */
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { faltaParaEscribir } from "../../../src/controladores/useAyudaVecinos";
import { useComentarios } from "../../../src/controladores/useComunidad";
import { useServicios } from "../../../src/controladores/useServicios";
import { nombreServicio } from "../../../src/modelos/categoriasServicio";
import { BotonPrincipal } from "../../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../../src/vistas/componentes/CampoConVoz";
import { Ilustracion } from "../../../src/vistas/componentes/Ilustracion";
import { Mensaje } from "../../../src/vistas/componentes/Mensaje";
import { Pantalla } from "../../../src/vistas/componentes/Pantalla";
import { Texto } from "../../../src/vistas/componentes/Texto";

export default function ComentarNegocio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const servicios = useServicios();
  const servicio = servicios.todos.find((s) => s.id === id);
  const nombre = servicio ? nombreServicio(servicio) : "este negocio";
  const [comentario, setComentario] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const com = useComentarios(id ? { servicioId: id } : null);
  const esperaCelular = useRef(false);

  const enviar = useCallback(async () => {
    if (!id) return;
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
    if (await com.enviar(comentario)) setHecho(true);
  }, [id, comentario, com]);

  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;

  useFocusEffect(
    useCallback(() => {
      if (!esperaCelular.current) return;
      esperaCelular.current = false;
      void faltaParaEscribir().then((falta) => {
        if (falta === null) void enviarRef.current();
      });
    }, []),
  );

  if (hecho) {
    return (
      <Pantalla
        titulo="¡Gracias!"
        textoEscuchar={`Gracias. Tu comentario sobre ${nombre} ya lo pueden leer tus vecinos.`}
        pie={
          <BotonPrincipal variante="tocar" icono="chevron-left" onPress={() => router.back()}>
            Volver al negocio
          </BotonPrincipal>
        }
      >
        <Ilustracion tipo="listo" />
        <Mensaje tono="listo">Tu comentario ya lo pueden leer tus vecinos.</Mensaje>
      </Pantalla>
    );
  }

  const motivoDesactivado = comentario.trim().length < 3 ? "Cuéntanos qué te pareció" : null;

  return (
    <Pantalla
      titulo="Comentar"
      volver
      textoEscuchar={`Comentar ${nombre}. Toca el micrófono y cuéntanos qué te pareció. Luego toca Publicar comentario.`}
      pie={
        <BotonPrincipal variante="listo" icono="send" cargando={com.ocupado} motivoDesactivado={motivoDesactivado} onPress={() => void enviar()}>
          Publicar comentario
        </BotonPrincipal>
      }
    >
      <Texto variante="subtitulo">{nombre}</Texto>
      <CampoConVoz
        etiqueta="¿Qué te pareció?"
        ayuda="El pan siempre fresquito"
        valor={comentario}
        onCambiar={setComentario}
        maxLength={140}
        completo={comentario.trim().length >= 3}
      />
      <Texto variante="ayuda">{`${comentario.length} de 140 letras · sin enlaces`}</Texto>
      <Mensaje tono="info">Lo leerán los vecinos de tu barrio, con tu nombre corto.</Mensaje>
      {aviso ? <Mensaje tono="aviso">{aviso}</Mensaje> : null}
      {com.error ? <Mensaje tono="aviso">{com.error}</Mensaje> : null}
    </Pantalla>
  );
}
