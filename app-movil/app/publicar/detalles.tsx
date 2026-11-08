/**
 * Vista. Detalles opcionales para publicar/editar un servicio.
 * - Sin ?id=: publica nuevo servicio (insert)
 * - Con ?id=: edita servicio propio (update), carga datos de servicios_publicos (es_mio = true)
 * Nombre del negocio, precio desde, dirección, descripción (140 chars, voz, contador),
 * hora apertura/cierre (botones cada 30 min 06:00-22:00 en modal),
 * casilla "Disponible en emergencias".
 */
import { useState, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, Modal } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useGuardarServicio } from "../../src/controladores/useGuardarServicio";
import { useVoz } from "../../src/controladores/useVoz";
import { useServicios } from "../../src/controladores/useServicios";
import type { CrearServicioDTO, Oficio, ServicioPublico } from "../../src/modelos/tipos";
import { Encabezado } from "../../src/vistas/componentes/Encabezado";
import { Aviso } from "../../src/vistas/componentes/Aviso";
import { Boton } from "../../src/vistas/componentes/Boton";
import { useTema } from "../../src/vistas/tema/useTema";

const HORAS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00",
];

export default function PantallaDetalles() {
  const { tema } = useTema();
  const tamano = (base: number) => Math.max(18, Math.round(base * tema.escalaLetra));
  const { id } = useLocalSearchParams<{ id?: string }>();
  const guardar = useGuardarServicio();
  const servicios = useServicios();
  const editando = Boolean(id);

  // Estado del formulario
  const [oficio, setOficio] = useState<Oficio>("bodega");
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [precioDesde, setPrecioDesde] = useState("");
  const [direccion, setDireccion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [horaApertura, setHoraApertura] = useState<string | null>(null);
  const [horaCierre, setHoraCierre] = useState<string | null>(null);
  const [disponibleEmergencia, setDisponibleEmergencia] = useState(false);
  const [mostrarModalHora, setMostrarModalHora] = useState<"apertura" | "cierre" | null>(null);

  const voz = useVoz((texto: string) => setDescripcion(texto.slice(0, 140)));

  // Cargar datos del servicio si estamos editando
  useEffect(() => {
    if (!editando || !id) return;
    const servicio = servicios.todos.find((s) => s.id === id && s.esMio);
    if (servicio) {
      setOficio(servicio.oficio as Oficio);
      setNombreNegocio(servicio.nombreNegocio ?? "");
      setPrecioDesde(servicio.precioDesde !== undefined ? String(servicio.precioDesde) : "");
      setDireccion(servicio.direccion ?? "");
      setDescripcion(servicio.descripcion ?? "");
      setHoraApertura(servicio.horaApertura ?? null);
      setHoraCierre(servicio.horaCierre ?? null);
      setDisponibleEmergencia(servicio.disponibleEmergencia ?? false);
    }
  }, [editando, id, servicios.todos]);

  const alGuardar = () => {
    const dto: CrearServicioDTO = {
      oficio,
      nombreNegocio: nombreNegocio.trim() || undefined,
      precioDesde: precioDesde ? Number(precioDesde) : undefined,
      direccion: direccion.trim() || undefined,
      descripcion: descripcion.trim() || undefined,
      horaApertura: horaApertura || undefined,
      horaCierre: horaCierre || undefined,
      disponibleEmergencia,
      mostrarTelefono: false,
      mostrarDireccion: false,
    };
    guardar.guardar({ dto, id });
  };

  const abrirModalHora = (tipo: "apertura" | "cierre") => setMostrarModalHora(tipo);
  const cerrarModalHora = () => setMostrarModalHora(null);
  const seleccionarHora = (hora: string) => {
    if (mostrarModalHora === "apertura") setHoraApertura(hora);
    else if (mostrarModalHora === "cierre") setHoraCierre(hora);
    cerrarModalHora();
  };

  const onVolver = () => router.back();

  return (
    <ScrollView contentContainerStyle={[estilos.pagina, { backgroundColor: tema.colores.fondo }]}>
      <Encabezado onVolver={onVolver} />

      <Aviso tipo="amarillo">Nadie debe pedirte dinero ni claves por publicar tu servicio.</Aviso>

      <Text style={[estilos.seccionTitulo, { fontSize: tamano(20), color: tema.colores.texto }]}>
        {editando ? "Editar servicio" : "Detalles opcionales"}
      </Text>

      <TextInput
        value={nombreNegocio}
        onChangeText={setNombreNegocio}
        placeholder="Nombre del negocio"
        style={[estilos.campo, { fontSize: tamano(18), color: tema.colores.texto, backgroundColor: tema.colores.superficie }]}
        maxLength={60}
      />

      <TextInput
        value={precioDesde}
        onChangeText={(v) => setPrecioDesde(v.replace(/\D/g, ""))}
        placeholder="Precio desde (soles)"
        keyboardType="numeric"
        style={[estilos.campo, { fontSize: tamano(18), color: tema.colores.texto, backgroundColor: tema.colores.superficie }]}
      />

      <TextInput
        value={direccion}
        onChangeText={setDireccion}
        placeholder="Dirección"
        style={[estilos.campo, { fontSize: tamano(18), color: tema.colores.texto, backgroundColor: tema.colores.superficie }]}
        maxLength={100}
      />

      <View style={estilos.filaDescripcion}>
        <Text style={[estilos.label, { fontSize: tamano(18), color: tema.colores.texto }]}>Descripción</Text>
        <Text style={[estilos.contador, { fontSize: tamano(14), color: tema.colores.textoSecundario }]}>
          {descripcion.length}/140
        </Text>
      </View>
      <TextInput
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Qué ofreces, sin enlaces"
        multiline
        numberOfLines={3}
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

      <Text style={[estilos.seccionTitulo, { fontSize: tamano(18), color: tema.colores.texto, marginTop: 16 }]}>Horario</Text>
      <View style={estilos.filaHorario}>
        <Pressable onPress={() => abrirModalHora("apertura")} style={[estilos.botonHora, { backgroundColor: tema.colores.superficie }]}>
          <Text style={[estilos.botonHoraTexto, { fontSize: tamano(18), color: tema.colores.texto }]}>
            Abre: {horaApertura ? `${horaApertura.slice(0, 5)}` : "—"}
          </Text>
        </Pressable>
        <Pressable onPress={() => abrirModalHora("cierre")} style={[estilos.botonHora, { backgroundColor: tema.colores.superficie }]}>
          <Text style={[estilos.botonHoraTexto, { fontSize: tamano(18), color: tema.colores.texto }]}>
            Cierra: {horaCierre ? `${horaCierre.slice(0, 5)}` : "—"}
          </Text>
        </Pressable>
      </View>
      {(horaApertura && !horaCierre) || (!horaApertura && horaCierre) ? (
        <Text style={[estilos.avisoHora, { fontSize: tamano(14), color: tema.colores.peligro }]}>
          Si pones hora de apertura, debes poner la de cierre (y viceversa).
        </Text>
      ) : null}

      <View style={estilos.filaPermiso}>
        <Text style={[estilos.textoPermiso, { fontSize: tamano(18), color: tema.colores.texto }]}>Disponible en emergencias</Text>
        <Switch value={disponibleEmergencia} onValueChange={setDisponibleEmergencia} />
      </View>

      <Pressable
        disabled={guardar.enviando}
        onPress={alGuardar}
        style={[estilos.botonGrande, { backgroundColor: tema.colores.confirmado }]}
      >
        <Text style={[estilos.botonGrandeTexto, { fontSize: tamano(20), color: tema.colores.fondo }]}>
          {guardar.enviando ? "Guardando…" : editando ? "Guardar cambios" : "Publicar"}
        </Text>
      </Pressable>

      {guardar.listo && <Aviso tipo="verde">{editando ? "Cambios guardados" : "Tu servicio ya está publicado"}</Aviso>}
      {guardar.error && <Aviso tipo="amarillo">{guardar.error}</Aviso>}

      {/* Modal de horas */}
      <Modal visible={mostrarModalHora !== null} animationType="slide" transparent={true}>
        <Pressable onPress={cerrarModalHora} style={estilos.modalFondo}>
          <View style={estilos.modalContenido}>
            <Text style={[estilos.modalTitulo, { fontSize: tamano(20), color: tema.colores.texto }]}>
              {mostrarModalHora === "apertura" ? "Hora de apertura" : "Hora de cierre"}
            </Text>
            <ScrollView contentContainerStyle={estilos.modalLista}>
              {HORAS.map((hora) => (
                <Pressable
                  key={hora}
                  onPress={() => seleccionarHora(hora)}
                  style={[
                    estilos.modalItem,
                    (mostrarModalHora === "apertura" && horaApertura === hora) ||
                    (mostrarModalHora === "cierre" && horaCierre === hora)
                      ? { backgroundColor: tema.colores.accion }
                      : { backgroundColor: tema.colores.superficie },
                  ]}
                >
                  <Text style={[
                    estilos.modalItemTexto,
                    { fontSize: tamano(18), color: ((mostrarModalHora === "apertura" && horaApertura === hora) ||
                      (mostrarModalHora === "cierre" && horaCierre === hora)) ? tema.colores.fondo : tema.colores.texto },
                  ]}>
                    {hora}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={cerrarModalHora} style={[estilos.botonModalCerrar, { backgroundColor: tema.colores.textoSecundario }]}>
              <Text style={[estilos.botonModalCerrarTexto, { fontSize: tamano(18), color: tema.colores.fondo }]}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 14, padding: 16, paddingBottom: 32 },
  seccionTitulo: { fontWeight: "700" },
  campo: { minHeight: 52, borderRadius: 8, paddingHorizontal: 12 },
  filaDescripcion: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontWeight: "600" },
  contador: { fontWeight: "500" },
  campoTexto: { minHeight: 80, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, textAlignVertical: "top" },
  botonVoz: { alignItems: "center", paddingVertical: 8 },
  botonVozTexto: { fontWeight: "600", textDecorationLine: "underline" },
  filaHorario: { flexDirection: "row", gap: 10 },
  botonHora: { flex: 1, minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  botonHoraTexto: { fontWeight: "500" },
  avisoHora: { marginTop: 4 },
  filaPermiso: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  textoPermiso: { fontWeight: "500" },
  botonGrande: { minHeight: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  botonGrandeTexto: { fontWeight: "700" },
  // Modal
  modalFondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContenido: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 12, maxHeight: "70%" },
  modalTitulo: { fontWeight: "700", textAlign: "center" },
  modalLista: { gap: 4, maxHeight: 300 },
  modalItem: { minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  modalItemTexto: { fontWeight: "500" },
  botonModalCerrar: { minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
  botonModalCerrarTexto: { fontWeight: "700" },
});