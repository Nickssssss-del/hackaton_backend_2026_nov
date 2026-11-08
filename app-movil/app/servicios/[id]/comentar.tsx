/**
 * Vista. «Comentar con mi voz» (pie de E3, Mockup v4 p. 18).
 * Hoy el comentario viaja con el visto bueno (vistos_buenos.comentario, 140 letras, sin enlaces):
 * la tabla propia de comentarios es una propuesta del borrador SQL. Por eso se comenta una sola vez
 * por negocio, junto con el visto bueno (decisión D-10).
 */
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { faltaParaEscribir } from "../../../src/controladores/useAyudaVecinos";
import { useServicios } from "../../../src/controladores/useServicios";
import { MOTIVO_UN_TOQUE, MOTIVOS_VISTO_BUENO, useVistoBueno, useYaDiVistoBueno } from "../../../src/controladores/useServiciosV4";
import { nombreServicio } from "../../../src/modelos/categoriasServicio";
import type { MotivoVistoBueno } from "../../../src/modelos/tipos";
import { BotonPrincipal } from "../../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../../src/vistas/componentes/CampoConVoz";
import { Ilustracion } from "../../../src/vistas/componentes/Ilustracion";
import { InterruptorSiNo } from "../../../src/vistas/componentes/InterruptorSiNo";
import { Mensaje } from "../../../src/vistas/componentes/Mensaje";
import { Opciones } from "../../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../../src/vistas/componentes/Pantalla";
import { Texto } from "../../../src/vistas/componentes/Texto";

export default function ComentarNegocio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const servicios = useServicios();
  const servicio = servicios.todos.find((s) => s.id === id);
  const nombre = servicio ? nombreServicio(servicio) : "este negocio";
  const [comentario, setComentario] = useState("");
  const [motivo, setMotivo] = useState<MotivoVistoBueno>(MOTIVO_UN_TOQUE);
  const [mostrar, setMostrar] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const vb = useVistoBueno();
  const { yaDi, marcar } = useYaDiVistoBueno(id);
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
    try {
      await vb.dar({ servicioId: id, motivo, comentario, mostrarComentario: mostrar });
      marcar();
    } catch {
      // El mensaje se muestra con vb.error.
    }
  }, [id, motivo, comentario, mostrar, vb, marcar]);

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

  if (vb.hecho) {
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
        <Mensaje tono="listo">{mostrar ? "Tu comentario y tu visto bueno ya cuentan." : "Tu visto bueno ya cuenta. El comentario queda solo para el negocio."}</Mensaje>
      </Pantalla>
    );
  }

  const motivoDesactivado = yaDi
    ? "Ya comentaste este negocio"
    : comentario.trim().length < 3
      ? "Cuéntanos qué te pareció"
      : null;

  return (
    <Pantalla
      titulo="Comentar"
      volver
      textoEscuchar={`Comentar ${nombre}. Toca el micrófono y cuéntanos qué te pareció. Luego toca Publicar comentario.`}
      pie={
        <BotonPrincipal variante="listo" icono="send" cargando={vb.enviando} motivoDesactivado={motivoDesactivado} onPress={() => void enviar()}>
          Publicar comentario
        </BotonPrincipal>
      }
    >
      <Texto variante="subtitulo">{nombre}</Texto>
      {yaDi ? (
        <Mensaje tono="info">Ya diste tu visto bueno a este negocio. Por ahora se comenta una sola vez.</Mensaje>
      ) : null}

      <CampoConVoz
        etiqueta="¿Qué te pareció?"
        ayuda="El pan siempre fresquito"
        valor={comentario}
        onCambiar={(t) => {
          vb.reiniciar();
          setComentario(t);
        }}
        maxLength={140}
        completo={comentario.trim().length >= 3}
      />
      <Texto variante="ayuda">{`${comentario.length} de 140 letras · sin enlaces`}</Texto>

      <Texto variante="etiqueta">¿Por qué lo recomiendas?</Texto>
      <Opciones
        nombre="¿Por qué lo recomiendas?"
        columnas={2}
        opciones={MOTIVOS_VISTO_BUENO.map((m) => ({ valor: m.valor, etiqueta: m.etiqueta }))}
        seleccion={[motivo]}
        onCambiar={(sel) => sel[0] && setMotivo(sel[0])}
      />

      <InterruptorSiNo etiqueta="Mis vecinos ven mi comentario" valor={mostrar} onCambiar={setMostrar} />

      {aviso ? <Mensaje tono="aviso">{aviso}</Mensaje> : null}
      {vb.error ? <Mensaje tono="aviso">{vb.error}</Mensaje> : null}
    </Pantalla>
  );
}
