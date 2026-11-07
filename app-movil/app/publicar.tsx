/**
 * Vista. Publicar un servicio, con permiso para mostrar teléfono y dirección.
 */
import { useForm, Controller } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { usePublicarServicio } from "../src/controladores/usePublicarServicio";
import { useVoz } from "../src/controladores/useVoz";
import type { CrearServicioDTO, Oficio } from "../src/modelos/tipos";
import { OFICIOS } from "../src/modelos/tipos";
import { BotonVoz } from "../src/vistas/BotonVoz";

export default function PantallaPublicar() {
  const publicar = usePublicarServicio();
  const formulario = useForm<CrearServicioDTO>({
    defaultValues: {
      oficio: "bodega",
      descripcion: "",
      mostrarDireccion: false,
      mostrarTelefono: false,
      disponibleEmergencia: false,
      contacto: "",
    },
  });
  const voz = useVoz((texto) => formulario.setValue("descripcion", texto.slice(0, 140)));

  return (
    <ScrollView contentContainerStyle={estilos.pagina}>
      <Text>Nadie del barrio te va a pedir dinero por adelantado ni tus claves.</Text>
      <BotonVoz escuchando={voz.escuchando} onPulsar={() => void voz.alternar()} />
      <Controller
        control={formulario.control}
        name="nombreNegocio"
        render={({ field }) => <TextInput value={field.value} onChangeText={field.onChange} placeholder="Nombre del negocio" style={estilos.campo} />}
      />
      <View style={estilos.chips}>
        {OFICIOS.map((oficio) => (
          <Pressable key={oficio} onPress={() => formulario.setValue("oficio", oficio as Oficio)} style={estilos.chip}>
            <Text>{formulario.watch("oficio") === oficio ? `· ${oficio}` : oficio}</Text>
          </Pressable>
        ))}
      </View>
      <Controller
        control={formulario.control}
        name="descripcion"
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            maxLength={140}
            placeholder="Descripción, sin enlaces"
            style={voz.teclado ? estilos.teclado : estilos.campo}
          />
        )}
      />
      <Controller
        control={formulario.control}
        name="precioDesde"
        render={({ field }) => (
          <TextInput
            value={field.value === undefined ? "" : String(field.value)}
            onChangeText={(valor) => field.onChange(valor ? Number(valor) : undefined)}
            keyboardType="decimal-pad"
            placeholder="Precio desde"
            style={estilos.campo}
          />
        )}
      />
      <Controller control={formulario.control} name="horaApertura" render={({ field }) => <TextInput value={field.value} onChangeText={field.onChange} placeholder="Abre (07:00)" style={estilos.campo} />} />
      <Controller control={formulario.control} name="horaCierre" render={({ field }) => <TextInput value={field.value} onChangeText={field.onChange} placeholder="Cierra (21:00)" style={estilos.campo} />} />
      <Controller control={formulario.control} name="direccion" render={({ field }) => <TextInput value={field.value} onChangeText={field.onChange} placeholder="Dirección" style={estilos.campo} />} />
      <Controller control={formulario.control} name="contacto" render={({ field }) => <TextInput value={field.value} onChangeText={field.onChange} placeholder="Celular de 9 dígitos" style={estilos.campo} />} />
      <FilaPermiso texto="Mostrar mi teléfono" valor={formulario.watch("mostrarTelefono")} cambiar={(valor) => formulario.setValue("mostrarTelefono", valor)} />
      <FilaPermiso texto="Mostrar mi dirección" valor={formulario.watch("mostrarDireccion")} cambiar={(valor) => formulario.setValue("mostrarDireccion", valor)} />
      <FilaPermiso texto="Disponible en emergencia" valor={formulario.watch("disponibleEmergencia")} cambiar={(valor) => formulario.setValue("disponibleEmergencia", valor)} />
      <Pressable disabled={publicar.enviando} onPress={() => void formulario.handleSubmit((datos) => publicar.publicar(datos))()} style={estilos.boton}>
        <Text style={estilos.botonTexto}>Publicar</Text>
      </Pressable>
      {publicar.listo ? <Text>Servicio publicado.</Text> : null}
      {publicar.error ? <Text>{publicar.error}</Text> : null}
    </ScrollView>
  );
}

function FilaPermiso({ texto, valor, cambiar }: { texto: string; valor: boolean; cambiar: (valor: boolean) => void }) {
  return (
    <View style={estilos.permiso}>
      <Text>{texto}</Text>
      <Switch value={valor} onValueChange={cambiar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: 12, padding: 16 },
  campo: { minHeight: 48, borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#f4f1ea" },
  teclado: { minHeight: 72, fontSize: 28, borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#f4f1ea" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 36, justifyContent: "center", paddingHorizontal: 8, borderRadius: 8, backgroundColor: "#f4f1ea" },
  permiso: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  boton: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#1f4b3a" },
  botonTexto: { color: "#ffffff", fontWeight: "700" },
});
