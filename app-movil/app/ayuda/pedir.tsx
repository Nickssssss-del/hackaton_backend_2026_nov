/**
 * Vista. Pedir un favor en 3 toques (mockup págs. 12 y 13).
 * Toque 1: "Pedir un favor" (pantalla de bienvenida)
 * Toque 2: Categoría en mosaicos grandes con ícono + descripción opcional con voz (140 chars, sin enlaces)
 *   En categoría salud: aviso "No escribas diagnósticos ni medicinas"
 * Toque 3: Confirmación "¿Enviar tu pedido?" con "Lo verán vecinos de tu zona" y botones "Sí, enviar" / "No, volver"
 */
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { usePedirFavor } from "../../src/controladores/useAyuda";
import { useVoz } from "../../src/controladores/useVoz";
import type { CategoriaPedido } from "../../src/modelos/tipos";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { Aviso } from "../../src/vistas/componentes/Aviso";
import { Boton } from "../../src/vistas/componentes/Boton";
import { useTema } from "../../src/vistas/tema/useTema";

const CATEGORIAS: CategoriaPedido[] = ["arreglos", "compras", "transporte", "salud"];

const ICONOS_CATEGORIA: Record<CategoriaPedido, string> = {
  arreglos: "🔧",
  compras: "🛒",
  transporte: "🚌",
  salud: "🏥",
  desastre_natural: "🌧️",
  apoyo: "🤝",
};

function formatearCategoria(cat: CategoriaPedido): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function PantallaPedirFavor() {
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));
  const pedir = usePedirFavor();

  const [paso, setPaso] = useState(1);
  const [categoria, setCategoria] = useState<CategoriaPedido>("arreglos");
  const [descripcion, setDescripcion] = useState("");

  const voz = useVoz((texto: string) => setDescripcion(texto.slice(0, 140)));

  const irAPaso2 = () => setPaso(2);
  const irAPaso3 = () => setPaso(3);
  const volverAPaso1 = () => setPaso(1);
  const volverAPaso2 = () => setPaso(2);

  const onVolver = () => {
    if (paso === 1) router.back();
    else if (paso === 2) volverAPaso1();
    else volverAPaso2();
  };

  const alEnviar = () => {
    pedir.enviar({ categoria, descripcion: descripcion.trim() });
  };

  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={onVolver} />

      {paso === 1 && (
        <>
          <Text style={[estilos.titulo, { fontSize: tamano(28), color: tema.colores.texto }]}>Pedir un favor</Text>
          <Text style={[estilos.subtitulo, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>
            Vecinos de tu zona verán tu pedido y podrán ayudarte
          </Text>
          <Aviso tipo="amarillo">Nadie debe pedirte dinero ni claves por adelantado.</Aviso>
          <Pressable onPress={irAPaso2} style={[estilos.botonGrande, { backgroundColor: tema.colores.accion }]}>
            <Text style={[estilos.botonGrandeTexto, { fontSize: tamano(22), color: tema.colores.fondo, fontWeight: "700" }]}>Continuar</Text>
          </Pressable>
        </>
      )}

      {paso === 2 && (
        <>
          <Text style={[estilos.titulo, { fontSize: tamano(24), color: tema.colores.texto }]}>¿En qué necesitas ayuda?</Text>

          <View style={estilos.gridCategorias}>
            {CATEGORIAS.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => { setCategoria(cat); irAPaso3(); }}
                style={[
                  estilos.tarjetaCategoria,
                  categoria === cat ? { borderWidth: 3, borderColor: tema.colores.accion } : { borderWidth: 1, borderColor: tema.colores.textoSecundario },
                ]}
              >
                <Text style={[estilos.iconoCategoria, { fontSize: tamano(40) }]}>{ICONOS_CATEGORIA[cat]}</Text>
                <Text style={[estilos.nombreCategoria, { fontSize: tamano(20), color: tema.colores.texto, fontWeight: "700" }]}>{formatearCategoria(cat)}</Text>
              </Pressable>
            ))}
          </View>

          {categoria === "salud" && (
            <Aviso tipo="amarillo">No escribas diagnósticos ni medicinas.</Aviso>
          )}

          <View style={estilos.filaDescripcion}>
            <Text style={[estilos.label, { fontSize: tamano(18), color: tema.colores.texto }]}>Descripción (opcional)</Text>
            <Text style={[estilos.contador, { fontSize: tamano(14), color: tema.colores.textoSecundario }]}>
              {descripcion.length}/140
            </Text>
          </View>
          <TextInput
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Qué necesitas, sin enlaces"
            multiline
            numberOfLines={4}
            maxLength={140}
            style={[
              estilos.campoTexto,
              { fontSize: voz.teclado ? tamano(28) : tamano(18), color: tema.colores.texto, backgroundColor: tema.colores.superficie },
            ]}
          />
          <Pressable onPress={() => void voz.alternar()} style={estilos.botonVoz}>
            <Text style={[estilos.botonVozTexto, { fontSize: tamano(16), color: voz.escuchando ? tema.colores.peligro : tema.colores.accion }]}>
              {voz.escuchando ? "Escuchando…" : voz.disponible ? "Decirlo con mi voz" : "Voz no disponible, usa el teclado"}
            </Text>
          </Pressable>
        </>
      )}

      {paso === 3 && (
        <>
          <Text style={[estilos.titulo, { fontSize: tamano(24), color: tema.colores.texto }]}>¿Enviar tu pedido?</Text>
          <Text style={[estilos.subtitulo, { fontSize: tamano(18), color: tema.colores.textoSecundario }]}>
            Lo verán vecinos de tu zona
          </Text>

          <View style={[estilos.resumen, { backgroundColor: tema.colores.superficie }]}>
            <View style={estilos.filaResumen}>
              <Text style={[estilos.iconoCategoria, { fontSize: tamano(28) }]}>{ICONOS_CATEGORIA[categoria]}</Text>
              <Text style={[estilos.resumenCategoria, { fontSize: tamano(20), color: tema.colores.texto, fontWeight: "700" }]}>{formatearCategoria(categoria)}</Text>
            </View>
            {descripcion.trim() && (
              <Text style={[estilos.resumenDescripcion, { fontSize: tamano(16), color: tema.colores.texto, marginTop: 8 }]}>{descripcion}</Text>
            )}
          </View>

          <View style={estilos.botonesConfirmacion}>
            <Pressable onPress={volverAPaso2} style={[estilos.botonNo, { backgroundColor: tema.colores.superficie, borderWidth: 1, borderColor: tema.colores.textoSecundario }]}>
              <Text style={[estilos.botonNoTexto, { fontSize: tamano(20), color: tema.colores.texto }]}>No, volver</Text>
            </Pressable>
            <Pressable
              disabled={pedir.enviando}
              onPress={alEnviar}
              style={[estilos.botonSi, { backgroundColor: tema.colores.confirmado }]}
            >
              <Text style={[estilos.botonSiTexto, { fontSize: tamano(20), color: tema.colores.fondo, fontWeight: "700" }]}>
                {pedir.enviando ? "Enviando…" : "Sí, enviar"}
              </Text>
            </Pressable>
          </View>

          {pedir.error && <Aviso tipo="amarillo">{pedir.error}</Aviso>}
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 16, padding: 16, paddingBottom: 32 },
  titulo: { fontWeight: "700", textAlign: "center" },
  subtitulo: { textAlign: "center" },
  gridCategorias: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  tarjetaCategoria: {
    width: 150,
    height: 150,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  iconoCategoria: {},
  nombreCategoria: { textAlign: "center" },
  filaDescripcion: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontWeight: "600" },
  contador: { fontWeight: "500" },
  campoTexto: { minHeight: 100, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, textAlignVertical: "top" },
  botonVoz: { alignItems: "center", paddingVertical: 8 },
  botonVozTexto: { fontWeight: "600", textDecorationLine: "underline" },
  botonGrande: { minHeight: 64, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  botonGrandeTexto: { fontWeight: "700" },
  resumen: { borderRadius: 12, padding: 16, gap: 8 },
  filaResumen: { flexDirection: "row", gap: 12, alignItems: "center" },
  resumenCategoria: {},
  resumenDescripcion: { lineHeight: 22 },
  botonesConfirmacion: { flexDirection: "row", gap: 10, marginTop: 16 },
  botonNo: { flex: 1, minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  botonNoTexto: { fontWeight: "700" },
  botonSi: { flex: 1, minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  botonSiTexto: { fontWeight: "700" },
});