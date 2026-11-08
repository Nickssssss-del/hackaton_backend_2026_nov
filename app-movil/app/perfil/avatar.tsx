/**
 * Vista. Mis datos › Mi avatar. Cuatro avatares grandes y «Automático» (se elige por la edad y el
 * género de Tus datos). Se guarda al tocar y vuelve a Mis datos. Solo en el teléfono.
 */
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferencias } from "../../src/controladores/PreferenciasContexto";
import { guardarAvatar, leerPerfil } from "../../src/controladores/registroVecinos";
import { AVATARES, elegirAvatar, type TipoAvatar } from "../../src/modelos/avatar";
import type { PerfilLocal } from "../../src/modelos/tipos";
import { Avatar } from "../../src/vistas/componentes/Avatar";
import { Icono } from "../../src/vistas/componentes/Icono";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";
import { RADIO } from "../../src/vistas/tema/tokens";
import { useTema } from "../../src/vistas/tema/useTema";

export default function MiAvatar() {
  const { tema } = useTema();
  const c = tema.colores;
  const { modo } = usePreferencias();
  const [perfil, setPerfil] = useState<PerfilLocal>({});

  useFocusEffect(
    useCallback(() => {
      void leerPerfil().then(setPerfil);
    }, []),
  );

  const elegir = async (tipo: TipoAvatar | null) => {
    await guardarAvatar(tipo);
    router.back();
  };

  const automatico = elegirAvatar({ edad: perfil.edad, genero: perfil.genero, modo });

  return (
    <Pantalla titulo="Mi avatar" volver textoEscuchar="Mi avatar. Elige señora, señor, joven mujer o joven hombre. O toca Automático.">
      <View style={estilos.rejilla} accessibilityRole="radiogroup">
        {AVATARES.map(({ tipo, etiqueta }) => {
          const activo = perfil.avatar === tipo;
          return (
            <Pressable
              key={tipo}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={etiqueta}
              onPress={() => void elegir(tipo)}
              style={[estilos.opcion, { backgroundColor: c.superficie, borderColor: activo ? c.accion : c.borde, borderWidth: activo ? 3 : 1.5 }]}
            >
              <Avatar tipo={tipo} tamano={96} />
              <Texto variante="etiqueta" centrado>{etiqueta}</Texto>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: !perfil.avatar }}
        onPress={() => void elegir(null)}
        style={[estilos.auto, { backgroundColor: c.superficie, borderColor: !perfil.avatar ? c.accion : c.borde, borderWidth: !perfil.avatar ? 3 : 1.5 }]}
      >
        <Avatar tipo={automatico} tamano={56} />
        <View style={{ flex: 1 }}>
          <Texto variante="etiqueta">Automático</Texto>
          <Texto variante="ayuda">Según tu edad y si eres mujer u hombre</Texto>
        </View>
        <Icono nombre="auto-fix" color={c.accionTexto} />
      </Pressable>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  rejilla: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  opcion: { flexBasis: "45%", flexGrow: 1, alignItems: "center", gap: 8, paddingVertical: 16, borderRadius: RADIO.l },
  auto: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: RADIO.l },
});
