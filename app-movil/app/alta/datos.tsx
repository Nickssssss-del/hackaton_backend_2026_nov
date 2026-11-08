/**
 * Vista. A4 · Tus datos · Paso 2 de 4 (Mockup v4, p. 5).
 * Nombre por voz o texto (borde verde cuando está completo), edad con − / + y «Eres».
 * Solo en el celular. Sin DNI (matriz técnica). Género: solo Mujer u Hombre (pedido del equipo); la edad se puede decir con la voz.
 * Con `editar=1` (Mis datos › Mis datos personales): sin pasos, botón «Guardar» y vuelve atrás.
 */
import { router, useLocalSearchParams } from "expo-router";
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
import { numeroDicho } from "../../src/modelos/numeroDicho";
import { IndicadorPasos } from "../../src/vistas/componentes/IndicadorPasos";
import { Opciones } from "../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";

const GENEROS: { valor: Genero; etiqueta: string }[] = [
  { valor: "mujer", etiqueta: "Mujer" },
  { valor: "hombre", etiqueta: "Hombre" },
];

export default function TusDatos() {
  const editando = useLocalSearchParams<{ editar?: string }>().editar === "1";
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState(EDAD_INICIAL);
  const [genero, setGenero] = useState<Genero | undefined>(undefined);
  // Edad dicha o escrita («setenta y cuatro», «74 años»); el contador queda para ajustar.
  const [textoEdad, setTextoEdad] = useState("");
  const dicha = numeroDicho(textoEdad);
  const edadDicha = dicha !== null && dicha >= EDAD_MINIMA && dicha <= EDAD_MAXIMA ? dicha : null;
  const cambiarEdad = (n: number) => {
    setEdad(n);
    setTextoEdad(String(n));
  };

  useEffect(() => {
    let activo = true;
    void leerPerfil().then((perfil) => {
      if (!activo) return;
      setNombre(perfil.nombre ?? "");
      if (perfil.edad) {
        setEdad(perfil.edad);
        setTextoEdad(String(perfil.edad));
      }
      setGenero(perfil.genero === "no_decir" ? undefined : perfil.genero);
    });
    return () => {
      activo = false;
    };
  }, []);

  const valido = nombreValido(nombre);

  const seguir = async () => {
    await guardarDatos(nombre, edad, genero);
    if (editando) router.back();
    else router.push("/alta/contactos");
  };

  return (
    <Pantalla
      titulo={editando ? "Mis datos personales" : "Tus datos"}
      volver
      encabezado={editando ? undefined : <IndicadorPasos paso={2} />}
      textoEscuchar="Paso 2 de 4. Tus datos. Di o escribe tu nombre y tu edad, y elige mujer u hombre."
      pie={
        <BotonPrincipal
          variante={editando ? "listo" : "tocar"}
          icono={editando ? "check" : undefined}
          motivoDesactivado={valido ? null : "Falta tu nombre"}
          onPress={() => void seguir()}
        >
          {editando ? "Guardar" : "Seguir"}
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
      <CampoConVoz
        etiqueta="Tu edad"
        ayuda="74"
        valor={textoEdad}
        onCambiar={(t) => {
          setTextoEdad(t);
          const n = numeroDicho(t);
          if (n !== null && n >= EDAD_MINIMA && n <= EDAD_MAXIMA) setEdad(n);
        }}
        maxLength={30}
        teclado="number-pad"
        completo={edadDicha !== null}
      />
      <Texto variante="ayuda">O ajústala con menos y más:</Texto>
      <Contador
        nombre="Edad"
        valor={`${edad} años`}
        onMenos={() => cambiarEdad(Math.max(EDAD_MINIMA, edad - 1))}
        onMas={() => cambiarEdad(Math.min(EDAD_MAXIMA, edad + 1))}
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
