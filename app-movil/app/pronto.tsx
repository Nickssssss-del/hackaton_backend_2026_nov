/**
 * Vista. Pantalla honesta para los módulos del Mockup v4 que aún no están construidos.
 * No simula funciones: dice qué hará la sección y que llega en una próxima versión.
 */
import { router, useLocalSearchParams } from "expo-router";
import { BotonPrincipal } from "../src/vistas/componentes/BotonPrincipal";
import { Icono, type NombreIcono } from "../src/vistas/componentes/Icono";
import { Mensaje } from "../src/vistas/componentes/Mensaje";
import { Pantalla } from "../src/vistas/componentes/Pantalla";
import { Texto } from "../src/vistas/componentes/Texto";
import { useTema } from "../src/vistas/tema/useTema";

const MODULOS: Record<string, { titulo: string; icono: NombreIcono; texto: string }> = {
  pastillas: {
    titulo: "Horario de pastillas",
    icono: "pill",
    texto: "Aquí anotarás tus pastillas y la app te avisará a la hora, aunque no haya internet.",
  },
  asistente: {
    titulo: "Pregúntale a Vecinos",
    icono: "robot-happy-outline",
    texto: "Aquí podrás preguntar con tu voz, por ejemplo: «¿Dónde compro pan cerca?».",
  },
  comunidad: {
    titulo: "Comunidad",
    icono: "account-multiple-outline",
    texto: "Aquí verás kermeses, misas y avisos del barrio, y podrás decir «Voy».",
  },
};

export default function Pronto() {
  const { tema } = useTema();
  const { modulo } = useLocalSearchParams<{ modulo?: string }>();
  const datos = MODULOS[modulo ?? ""] ?? { titulo: "Próximamente", icono: "clock-outline" as NombreIcono, texto: "Esta sección está en construcción." };
  return (
    <Pantalla
      titulo={datos.titulo}
      volver
      textoEscuchar={`${datos.titulo}. ${datos.texto} Esta parte llega en una próxima versión.`}
      pie={<BotonPrincipal variante="secundario" icono="chevron-left" onPress={() => router.back()}>Volver al inicio</BotonPrincipal>}
    >
      <Icono nombre={datos.icono} tamano={72} color={tema.colores.accionTexto} />
      <Texto>{datos.texto}</Texto>
      <Mensaje tono="aviso">Esta parte llega en una próxima versión.</Mensaje>
    </Pantalla>
  );
}
