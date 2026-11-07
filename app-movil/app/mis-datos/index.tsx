/**
 * Vista. Mis datos: perfil, contactos, ficha, preferencias y borrar cuenta.
 * Contactos, ficha y consentimiento solo en el teléfono.
 * Perfil (nombre, celular, barrio) en teléfono y, con internet, en nube.
 */
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTema } from "../../src/vistas/tema/useTema";
import { TemaProveedor } from "../../src/vistas/tema/TemaProveedor";
import { leerPreferencias, guardarPreferencias } from "../../src/modelos/local/preferencias";
import { leerPerfilLocal, guardarPerfilLocal } from "../../src/modelos/local/perfil";
import { leerContactosLocales } from "../../src/modelos/local/contactos";
import { leerFicha } from "../../src/modelos/local/ficha";
import { useConexion } from "../../src/controladores/useConexion";
import { usePerfil } from "../../src/controladores/usePerfil";
import { useEscuchar } from "../../src/controladores/useEscuchar";
import { useGruposCercanos } from "../../src/controladores/useGruposCercanos";
import { useBorrarMisDatos } from "../../src/controladores/useBorrarMisDatos";
import { usePreferencias } from "../../src/controladores/PreferenciasContexto";
import { Boton } from "../../src/vistas/componentes/Boton";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { Aviso } from "../../src/vistas/componentes/Aviso";

const OPCIONES_LETRA = [
  { valor: 1, etiqueta: "Normal" },
  { valor: 1.25, etiqueta: "Grande" },
  { valor: 1.5, etiqueta: "Enorme" },
] as const;

export default function PantallaMisDatos() {
  const { tema, cambiarTema } = useTema();
  const conexion = useConexion();
  const { perfil, guardar: guardarPerfil, asegurarPerfilEnNube, completo } = usePerfil();
  const voz = useEscuchar();
  const grupos = useGruposCercanos();
  const { sonidos, setSonidos } = usePreferencias();
  type PreferenciasEstado = { tema: "claro" | "oscuro"; escalaLetra: 1 | 1.25 | 1.5 };
  const [preferencias, setPreferencias] = useState<PreferenciasEstado>({
    tema: "claro",
    escalaLetra: 1,
  });
  const [cargandoPreferencias, setCargandoPreferencias] = useState(true);
  const [contactos, setContactos] = useState<{ nombre: string; telefono: string; relacion: string }[]>([]);
  const [ficha, setFicha] = useState<{ mensaje: string; consentimiento?: { aceptado: boolean; fecha: string } }>({
    mensaje: "",
    consentimiento: undefined,
  });

  // Cargar preferencias locales
  useEffect(() => {
    let activo = true;
    leerPreferencias().then((p) => {
      if (activo) {
        const temaCargado: "claro" | "oscuro" = p.tema === "oscuro" ? "oscuro" : "claro";
        setPreferencias({
          tema: temaCargado,
          escalaLetra: (p.escalaLetra ?? 1) as 1 | 1.25 | 1.5,
        });
        setCargandoPreferencias(false);
      }
    });
    return () => { activo = false; };
  }, []);

  // Aplicar tema y escala al cambiar preferencias
  useEffect(() => {
    if (cargandoPreferencias) return;
    if (preferencias.tema === "oscuro") {
      cambiarTema("oscuro");
    } else if (tema.nombre === "oscuro") {
      cambiarTema("claro");
    }
  }, [preferencias.tema, cargandoPreferencias, tema.nombre, cambiarTema]);

  // Cargar contactos y ficha
  useEffect(() => {
    let activo = true;
    Promise.all([leerContactosLocales(), leerFicha()]).then(([c, f]) => {
      if (activo) {
        setContactos(c);
        setFicha({ mensaje: f.mensaje, consentimiento: f.consentimiento });
      }
    });
    return () => { activo = false; };
  }, []);

  const cambiarEscala = async (valor: 1 | 1.25 | 1.5) => {
    const nuevas = { ...preferencias, escalaLetra: valor };
    setPreferencias(nuevas);
    await guardarPreferencias({ tema: nuevas.tema, escalaLetra: valor });
  };

  const cambiarTemaOscuro = async (activar: boolean) => {
    const nuevoTema = activar ? "oscuro" : "claro";
    const nuevas: PreferenciasEstado = { ...preferencias, tema: nuevoTema };
    setPreferencias(nuevas);
    await guardarPreferencias({ tema: nuevoTema, escalaLetra: nuevas.escalaLetra });
  };

  const cambiarSonidos = async (activar: boolean) => {
    await setSonidos(activar);
  };

  const editarPerfil = async () => {
    router.push("/mis-datos/perfil");
  };

  const { borrar: borrarCuenta, borrando } = useBorrarMisDatos();

  if (cargandoPreferencias) {
    return (
      <ScrollView contentContainerStyle={estilos.pagina}>
        <Text style={estilos.texto}>Cargando…</Text>
      </ScrollView>
    );
  }

  const nombre = perfil?.nombre?.trim() || "Sin nombre";
  const celular = perfil?.celular?.trim() || "Sin celular";
  const barrio = perfil?.zonaId || "Sin barrio";
  const brigada = grupos.find((g) => g.tipo === "brigada");

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Encabezado onVolver={() => router.back()} escuchar={() => void voz.escuchar("Mis datos")} />
      <Aviso tipo="azul">Tus contactos, ficha y consentimiento solo están en tu teléfono.</Aviso>

      {/* Tamaño de letra */}
      <View style={estilos.filaGrande}>
        <Text style={estilos.etiqueta}>Tamaño de letra</Text>
        <View style={estilos.opciones}>
          {OPCIONES_LETRA.map((op) => (
            <Boton
              key={op.valor}
              variante={preferencias.escalaLetra === op.valor ? "confirmar" : "secundario"}
              onPress={() => void cambiarEscala(op.valor)}
              style={{ minWidth: 90 }}
            >
              {op.etiqueta}
            </Boton>
          ))}
        </View>
      </View>

      {/* Modo oscuro */}
      <View style={estilos.filaGrande}>
        <Text style={estilos.etiqueta}>Modo oscuro</Text>
        <View style={estilos.opciones}>
          <Boton
            variante={preferencias.tema === "oscuro" ? "confirmar" : "secundario"}
            onPress={() => void cambiarTemaOscuro(true)}
            style={{ minWidth: 90 }}
          >
            Sí
          </Boton>
          <Boton
            variante={preferencias.tema === "claro" ? "confirmar" : "secundario"}
            onPress={() => void cambiarTemaOscuro(false)}
            style={{ minWidth: 90 }}
          >
            No
          </Boton>
        </View>
      </View>

      {/* Sonidos / lectura en voz alta */}
      <View style={estilos.filaGrande}>
        <Text style={estilos.etiqueta}>Sonidos / lectura en voz alta</Text>
        <View style={estilos.opciones}>
          <Boton
            variante={sonidos ? "confirmar" : "secundario"}
            onPress={() => void cambiarSonidos(true)}
            style={{ minWidth: 90 }}
          >
            Sí
          </Boton>
          <Boton
            variante={sonidos ? "secundario" : "confirmar"}
            onPress={() => void cambiarSonidos(false)}
            style={{ minWidth: 90 }}
          >
            No
          </Boton>
        </View>
      </View>

      {/* Mi perfil */}
      <View style={estilos.filaGrande}>
        <View style={estilos.infoPerfil}>
          <Text style={estilos.etiqueta}>Mi perfil</Text>
          <Text style={estilos.valor}>Nombre: {nombre}</Text>
          <Text style={estilos.valor}>Celular: {celular}</Text>
          <Text style={estilos.valor}>Barrio: {barrio}</Text>
        </View>
        <Boton variante="secundario" onPress={() => void editarPerfil()}>
          Cambiar
        </Boton>
      </View>

      {/* A quién avisamos */}
      <View style={estilos.filaGrande}>
        <View style={estilos.infoContactos}>
          <Text style={estilos.etiqueta}>A quién avisamos</Text>
          {contactos.map((c, i) => (
            <Text key={c.telefono} style={estilos.valor}>
              {i + 1}. {c.nombre} ({c.relacion || "sin relación"}) - {c.telefono}
            </Text>
          ))}
          {contactos.length === 0 && <Text style={estilos.valor}>Sin contactos guardados</Text>}
          {brigada && <Text style={estilos.valor}>Brigada: {brigada.nombre} ({brigada.contacto || "sin teléfono"})</Text>}
        </View>
        <Boton variante="secundario" onPress={() => router.push("/mis-datos/contactos")}>
          Cambiar
        </Boton>
      </View>

      {/* Mi ficha de emergencia */}
      <View style={estilos.filaGrande}>
        <View style={estilos.infoFicha}>
          <Text style={estilos.etiqueta}>Mi ficha de emergencia</Text>
          {ficha.mensaje ? (
            <Text style={estilos.valor}>{ficha.mensaje}</Text>
          ) : (
            <Text style={estilos.valor}>Sin datos</Text>
          )}
          <Text style={estilos.valor}>
            Consentimiento: {ficha.consentimiento?.aceptado === true ? "Aceptado" : ficha.consentimiento?.aceptado === false ? "No aceptado" : "Sin definir"}
          </Text>
        </View>
        <Boton variante="secundario" onPress={() => router.push("/mis-datos/ficha")}>
          Cambiar
        </Boton>
      </View>

      {/* Mis servicios */}
      <View style={estilos.filaGrande}>
        <Text style={estilos.etiqueta}>Mis servicios</Text>
        <Boton variante="secundario" onPress={() => router.push("/mis-servicios")}>
          Ver
        </Boton>
      </View>

      {/* Mis pedidos */}
      <View style={estilos.filaGrande}>
        <Text style={estilos.etiqueta}>Mis pedidos</Text>
        <Boton variante="secundario" onPress={() => router.push("/ayuda/mis-pedidos")}>
          Ver
        </Boton>
      </View>

      {/* Ver tutorial otra vez */}
      <View style={estilos.filaGrande}>
        <Text style={estilos.etiqueta}>Ver el tutorial otra vez</Text>
        <Boton variante="secundario" onPress={() => router.push("/bienvenida/tutorial")}>
          Ver
        </Boton>
      </View>

      {/* Borrar mis datos - botón discreto al final */}
      <View style={estilos.borrarContenedor}>
        <Boton
          variante="peligro"
          onPress={() => void borrarCuenta()}
          disabled={borrando}
          style={{ marginTop: 24 }}
        >
          {borrando ? "Borrando…" : "Borrar mis datos"}
        </Boton>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, gap: 16, padding: 16 },
  filaGrande: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52, gap: 12 },
  etiqueta: { fontSize: 18, flex: 1 },
  valor: { fontSize: 18, color: "#4A4A4A" },
  texto: { fontSize: 18 },
  opciones: { flexDirection: "row", gap: 8 },
  infoPerfil: { flex: 1, gap: 4 },
  infoContactos: { flex: 1, gap: 4 },
  infoFicha: { flex: 1, gap: 4 },
  borrarContenedor: { alignItems: "center", paddingTop: 16 },
});