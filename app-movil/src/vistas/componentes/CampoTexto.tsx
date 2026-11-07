import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

export function CampoTexto({ value, maxLength = 140, ...props }: TextInputProps & { maxLength?: number }) {
  return (
    <View>
      <TextInput {...props} value={value} maxLength={maxLength} style={[estilos.campo, props.style]} />
      <Text style={estilos.contador}>{String(value ?? "").length}/{maxLength}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: { minHeight: 52, fontSize: 18, borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#F4F1EA" },
  contador: { fontSize: 18, textAlign: "right", color: "#4A4A4A" },
});
