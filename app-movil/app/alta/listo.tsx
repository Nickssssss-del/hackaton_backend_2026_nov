/**
 * Vista. A6 · ¡Todo listo! (Mockup v4, p. 7).
 * Sin Volver. Muestra el nombre de A4. «Entrar» marca el registro como completo y abre
 * el Inicio del modo elegido en A2 (sencillo → adulto mayor, completo → vecino).
 */
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { usePreferencias } from "../../src/controladores/PreferenciasContexto";
import { completarRegistro, leerPerfil, rutaInicio } from "../../src/controladores/registroVecinos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { Ilustracion } from "../../src/vistas/componentes/Ilustracion";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";

export default function TodoListo() {
  const { modo } = usePreferencias();
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    void leerPerfil().then((perfil) => setNombre(perfil.nombre?.trim().split(/\s+/)[0] ?? ""));
  }, []);

  // Sin regreso al registro: el botón atrás de Android no hace nada en A6.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
      return () => sub.remove();
    }, []),
  );

  const titulo = nombre ? `¡Todo listo, ${nombre}!` : "¡Todo listo!";

  const entrar = async () => {
    await completarRegistro();
    router.replace(rutaInicio(modo));
  };

  return (
    <Pantalla
      textoEscuchar={`${titulo} Tus vecinos te cuidan. Si pides ayuda, verán dónde estás. Toca Entrar.`}
      pie={<BotonPrincipal icono="home-outline" onPress={() => void entrar()}>Entrar</BotonPrincipal>}
    >
      <Ilustracion tipo="listo" alto={200} />
      <Texto variante="grande" centrado accessibilityRole="header">{titulo}</Texto>
      <Texto variante="etiqueta" centrado>Tus vecinos te cuidan.</Texto>
      <Texto variante="ayuda" centrado>Si pides ayuda, verán dónde estás.</Texto>
    </Pantalla>
  );
}
