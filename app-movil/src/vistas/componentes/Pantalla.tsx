/**
 * Vista. Esqueleto de cada pantalla del Mockup v4:
 * barra superior, contenido desplazable (si la letra crece, nada se corta) y acción principal fija abajo.
 */
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ESPACIO } from "../tema/tokens";
import { useTema } from "../tema/useTema";
import { BarraSuperior } from "./BarraSuperior";
import { Texto } from "./Texto";

type Fondo = "normal" | "aviso" | "emergencia";

type Props = {
  titulo?: string;
  volver?: boolean | (() => void);
  /** Texto para Escuchar; si falta, se lee el título. */
  textoEscuchar?: string;
  /** Contenido entre la barra y el título (p. ej. "Paso 1 de 3"). */
  encabezado?: ReactNode;
  children: ReactNode;
  /** Botones fijos al pie (acción principal). */
  pie?: ReactNode;
  fondo?: Fondo;
  /** Oculta la barra superior (casos especiales del diseño). */
  sinBarra?: boolean;
};

export function Pantalla({ titulo, volver, textoEscuchar, encabezado, children, pie, fondo = "normal", sinBarra }: Props) {
  const { tema } = useTema();
  const colorFondo = fondo === "aviso" ? tema.colores.aviso : tema.colores.fondo;
  return (
    <SafeAreaView style={[estilos.raiz, { backgroundColor: colorFondo }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={estilos.raiz} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {sinBarra ? null : <BarraSuperior volver={volver} textoEscuchar={textoEscuchar ?? titulo} />}
          {encabezado}
          {titulo ? (
            <Texto variante="titulo" accessibilityRole="header" style={estilos.titulo}>
              {titulo}
            </Texto>
          ) : null}
          {children}
        </ScrollView>
        {pie ? (
          <View style={[estilos.pie, { backgroundColor: colorFondo, borderTopColor: tema.colores.borde }]}>{pie}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { padding: ESPACIO.l, gap: ESPACIO.m, flexGrow: 1 },
  titulo: { marginBottom: ESPACIO.xs },
  pie: { paddingHorizontal: ESPACIO.l, paddingVertical: ESPACIO.m, gap: ESPACIO.s, borderTopWidth: StyleSheet.hairlineWidth },
});
