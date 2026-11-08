/**
 * Vista. Íconos de línea (MaterialCommunityIcons) escalados con la letra.
 * Siempre acompañan a una palabra: el ícono es decorativo para lectores de pantalla.
 */
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps } from "react";
import { useTema } from "../tema/useTema";

export type NombreIcono = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function Icono({ nombre, tamano = 24, color }: { nombre: NombreIcono; tamano?: number; color?: string }) {
  const { tema } = useTema();
  return (
    <MaterialCommunityIcons
      name={nombre}
      size={Math.round(tamano * tema.escalaLetra)}
      color={color ?? tema.colores.texto}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
