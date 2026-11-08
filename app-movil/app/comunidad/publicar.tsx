/**
 * Vista. F3 · Nueva publicación (Mockup v4, p. 22).
 * Categoría (Kermés, Misa, Ayuda social, Donación, Taller, Otro) y mensaje por voz o teclado
 * (140 caracteres, sin enlaces) y foto opcional (bucket `fotos`). Hace falta foto o mensaje.
 * La base pone autor, zona y fecha, y permite 3 por día.
 * Si falta el celular, se pide aquí (/perfil/celular), como en Ayuda y Servicios.
 */
import { router } from "expo-router";
import { useState } from "react";
import { usePublicar } from "../../src/controladores/useComunidad";
import { faltaParaEscribir } from "../../src/controladores/useAyudaVecinos";
import { SUBIR_FOTOS } from "../../src/controladores/funciones";
import { useFotoNueva } from "../../src/controladores/useFotoNueva";
import {
  CATEGORIAS_PUBLICACION,
  ETIQUETA_PUBLICACION,
  type CategoriaPublicacion,
} from "../../src/modelos/comunidad";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { ElegirFoto } from "../../src/vistas/componentes/ElegirFoto";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Opciones } from "../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { ESTILO_PUBLICACION } from "../../src/vistas/componentes/estiloPublicacion";

// Orden del Mockup v4 (p. 22): Kermés, Misa, Donación / Ayuda social, Taller, Otro.
const ORDEN_MOCKUP: readonly CategoriaPublicacion[] = ["kermes", "misa", "donacion", "ayuda_social", "taller", "otro"];
const OPCIONES = ORDEN_MOCKUP.filter((v) => CATEGORIAS_PUBLICACION.includes(v)).map((valor) => ({
  valor,
  etiqueta: ETIQUETA_PUBLICACION[valor],
  icono: ESTILO_PUBLICACION[valor].icono,
  color: ESTILO_PUBLICACION[valor].color,
}));

export default function NuevaPublicacion() {
  const [categoria, setCategoria] = useState<CategoriaPublicacion | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const pub = usePublicar();
  const foto = useFotoNueva();

  // Mockup v4 (p. 22): «Falta foto o mensaje y la categoría».
  const sinContenido = mensaje.trim().length === 0 && !(SUBIR_FOTOS && foto.foto);
  const falta = sinContenido && !categoria
    ? SUBIR_FOTOS ? "Falta foto o mensaje y la categoría" : "Falta el mensaje y la categoría"
    : sinContenido
      ? SUBIR_FOTOS ? "Falta foto o mensaje" : "Falta el mensaje"
      : !categoria
        ? "Falta la categoría"
        : null;

  const enviar = async () => {
    if (!categoria) return;
    setAviso(null);
    const necesita = await faltaParaEscribir();
    if (necesita === "celular") {
      router.push("/perfil/celular");
      setAviso("Cuando guardes tu celular, vuelve y toca Publicar.");
      return;
    }
    if (necesita === "registro") {
      setAviso("Primero elige tu barrio: Mis datos › Mi barrio.");
      return;
    }
    try {
      await pub.publicar(categoria, mensaje, SUBIR_FOTOS && foto.foto ? foto.subir : undefined);
    } catch {
      // El mensaje se muestra con pub.error.
    }
  };

  if (pub.hecho) {
    return (
      <Pantalla
        titulo="Publicado"
        volver
        textoEscuchar="Listo. Tus vecinos ya pueden ver tu publicación."
        pie={
          <BotonPrincipal variante="listo" icono="check" onPress={() => router.back()}>
            Ver la comunidad
          </BotonPrincipal>
        }
      >
        <Mensaje tono="listo">Listo. Tus vecinos ya pueden ver tu publicación.</Mensaje>
      </Pantalla>
    );
  }

  return (
    <Pantalla
      titulo="Nueva publicación"
      volver
      textoEscuchar="Nueva publicación. Cuenta qué quieres avisar con tu voz. Luego elige de qué se trata: kermés, misa, donación, ayuda social, taller u otro."
      pie={
        <BotonPrincipal variante="listo" icono="send" cargando={pub.enviando} motivoDesactivado={falta} onPress={() => void enviar()}>
          Publicar
        </BotonPrincipal>
      }
    >
      {SUBIR_FOTOS ? <ElegirFoto estado={foto} forma="recuadro" descripcion="Foto de tu publicación" /> : null}
      <CampoConVoz
        etiqueta="¿Qué quieres contar?"
        ayuda="Kermés el domingo…"
        valor={mensaje}
        onCambiar={setMensaje}
        maxLength={140}
        completo={mensaje.trim().length > 0}
      />
      <Texto variante="etiqueta">¿De qué se trata?</Texto>
      <Opciones
        nombre="¿De qué se trata?"
        tarjetas
        columnas={3}
        opciones={OPCIONES}
        seleccion={categoria ? [categoria] : []}
        onCambiar={(sel) => setCategoria(sel[0] ?? null)}
      />
      {aviso ? <Mensaje tono="aviso">{aviso}</Mensaje> : null}
      {pub.error ? <Mensaje tono="aviso">{pub.error}</Mensaje> : null}
      <Mensaje tono="info">Lo verán solo los vecinos de tu barrio, con tu nombre corto. Puedes publicar hasta 3 cosas por día.</Mensaje>
    </Pantalla>
  );
}
