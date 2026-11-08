/**
 * Vista. A4 · Tus datos · Paso 2 de 3 (Mockup v4, p. 5).
 * Nombre por voz o texto (borde verde cuando está completo), edad con − / + y «Eres».
 * Solo en el celular. Sin DNI (matriz técnica). «No decir» es una respuesta válida.
 */
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  EDAD_INICIAL,
  EDAD_MAXIMA,
  EDAD_MINIMA,
  guardarDatos,
  leerPerfil,
  nombreValido,
} from "../../src/controladores/registroVecinos";
import type { Genero } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { Contador } from "../../src/vistas/componentes/Contador";
import { IndicadorPasos } from "../../src/vistas/componentes/IndicadorPasos";
import { Opciones } from "../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";

const GENEROS: { valor: Genero; etiqueta: string }[] = [
  { valor: "mujer", etiqueta: "Mujer" },
  { valor: "hombre", etiqueta: "Hombre" },
  { valor: "no_decir", etiqueta: "No decir" },
];

export default function TusDatos() {
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState(EDAD_INICIAL);
  const [genero, setGenero] = useState<Genero | undefined>(undefined);

  useEffect(() => {
    let activo = true;
    void leerPerfil().then((perfil) => {
      if (!activo) return;
      setNombre(perfil.nombre ?? "");
      if (perfil.edad) setEdad(perfil.edad);
      setGenero(perfil.genero);
    });
    return () => {
      activo = false;
    };
  }, []);

  const valido = nombreValido(nombre);

  const seguir = async () => {
    await guardarDatos(nombre, edad, genero);
    router.push("/alta/contactos");
  };

  return (
    <Pantalla
      titulo="Tus datos"
      volver
      encabezado={<IndicadorPasos paso={2} />}
      textoEscuchar="Paso 2 de 3. Tus datos. Di o escribe tu nombre, elige tu edad con menos y más, y elige mujer, hombre o no decir."
      pie={
        <BotonPrincipal motivoDesactivado={valido ? null : "Falta tu nombre"} onPress={() => void seguir()}>
          Seguir
        </BotonPrincipal>
      }
    >
      <CampoConVoz
        etiqueta="Tu nombre"
        ayuda="Rosa Quispe"
        valor={nombre}
        onCambiar={setNombre}
        maxLength={60}
        completo={valido}
      />
      <Texto variante="etiqueta">Edad</Texto>
      <Contador
        nombre="Edad"
        valor={`${edad} años`}
        onMenos={() => setEdad((e) => Math.max(EDAD_MINIMA, e - 1))}
        onMas={() => setEdad((e) => Math.min(EDAD_MAXIMA, e + 1))}
        puedeMenos={edad > EDAD_MINIMA}
        puedeMas={edad < EDAD_MAXIMA}
      />
      <Texto variante="etiqueta">Eres</Texto>
      <Opciones
        nombre="Eres"
        opciones={GENEROS}
        seleccion={genero ? [genero] : []}
        onCambiar={(seleccion) => setGenero(seleccion[0])}
      />
    </Pantalla>
  );
}
