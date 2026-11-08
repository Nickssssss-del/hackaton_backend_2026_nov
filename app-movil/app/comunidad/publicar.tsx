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

const OPCIONES = CATEGORIAS_PUBLICACION.map((valor) => ({
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

  const falta = !categoria ? "Elige qué es" : mensaje.trim().length === 0 && !foto.foto ? "Escribe el mensaje o agrega una foto" : null;

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
      setAviso("Primero marca dónde vives: Mis datos › Mi dirección.");
      return;
    }
    try {
      await pub.publicar(categoria, mensaje, foto.foto ? foto.subir : undefined);
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
      textoEscuchar="Nueva publicación. Elige qué es: kermés, misa, ayuda social, donación, taller u otro. Luego cuenta los detalles con tu voz o escríbelos. Si quieres, agrega una foto."
      pie={
        <BotonPrincipal variante="listo" icono="send" cargando={pub.enviando} motivoDesactivado={falta} onPress={() => void enviar()}>
          Publicar
        </BotonPrincipal>
      }
    >
      <Texto variante="etiqueta">¿Qué quieres avisar?</Texto>
      <Opciones
        nombre="¿Qué quieres avisar?"
        tarjetas
        columnas={3}
        opciones={OPCIONES}
        seleccion={categoria ? [categoria] : []}
        onCambiar={(sel) => setCategoria(sel[0] ?? null)}
      />
      <CampoConVoz
        etiqueta="Cuéntalo"
        ayuda="Kermés el domingo a las 10 en la parroquia"
        valor={mensaje}
        onCambiar={setMensaje}
        maxLength={140}
        completo={mensaje.trim().length > 0}
      />
      <Texto variante="ayuda">{`${mensaje.trim().length} de 140 letras. Sin páginas web.`}</Texto>
      <Texto variante="etiqueta">Foto (si quieres)</Texto>
      <ElegirFoto estado={foto} descripcion="Foto de tu publicación" />
      {aviso ? <Mensaje tono="aviso">{aviso}</Mensaje> : null}
      {pub.error ? <Mensaje tono="aviso">{pub.error}</Mensaje> : null}
      <Mensaje tono="info">Lo verán solo los vecinos de tu barrio, con tu nombre corto. Puedes publicar hasta 3 cosas por día.</Mensaje>
    </Pantalla>
  );
}
