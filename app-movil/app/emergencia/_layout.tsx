import { Stack } from "expo-router";
import { useEffect } from "react";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useTema } from "../../src/vistas/tema/useTema";

export default function EmergenciaLayout() {
  const { activarEmergencia, salirEmergencia } = useTema();
  const voz = useEscuchar();

  useEffect(() => {
    activarEmergencia();
    return () => {
      voz.silenciar();
      salirEmergencia();
    };
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
