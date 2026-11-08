/**
 * Controlador. Borrar mis datos (RPC + limpieza local).
 * No importa supabase ni Repositorio en la vista.
 */
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useConexion } from "./useConexion";
import { borrarMisDatos } from "../modelos/cuentaRepositorio";
import { asegurarSesionAnonima } from "../modelos/supabase";
import { consultaCliente } from "./ProveedorConsulta";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PREFIJO } from "../modelos/almacen";

export function useBorrarMisDatos() {
  const conexion = useConexion();
  const [borrando, setBorrando] = useState(false);

  const borrar = useCallback(async () => {
    if (conexion !== "conectado") {
      Alert.alert("Sin conexión", "Necesitas internet para borrar tus datos.", [{ text: "Entendido" }]);
      return;
    }

    Alert.alert(
      "¿Seguro?",
      "También se borrará lo que publicaste y tus pedidos.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, borrar todo",
          style: "destructive",
          onPress: async () => {
            setBorrando(true);
            try {
              await asegurarSesionAnonima();
              await borrarMisDatos();

              // Borrar TODAS las claves barrio.* de AsyncStorage
              const claves = await AsyncStorage.getAllKeys();
              const clavesBarrio = claves.filter((k) => k.startsWith(PREFIJO));
              if (clavesBarrio.length > 0) {
                await AsyncStorage.multiRemove(clavesBarrio);
              }

              // Vaciar caché de react-query (incluye persistida)
              await consultaClient.clear();
              await consultaClient.persistClient();

              // Cerrar sesión de Supabase
              const { obtenerSupabase } = await import("../modelos/supabase");
              const supabase = obtenerSupabase();
              await supabase.auth.signOut();

              // Volver a la puerta (/) que mostrará el tutorial como app nueva
              router.replace("/");
            } catch {
              Alert.alert("No se pudo borrar", "Algo salió mal. Inténtalo otra vez.", [{ text: "Entendido" }]);
            } finally {
              setBorrando(false);
            }
          },
        },
      ],
    );
  }, [conexion]);

  return { borrar, borrando };
}

// Cliente de consultas para limpiar caché
const consultaClient = consultaCliente as any;