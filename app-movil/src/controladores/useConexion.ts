import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export type EstadoConexion = "conectado" | "sin internet" | "desconocido";

function convertir(estado: NetInfoState): EstadoConexion {
  if (estado.isInternetReachable === true) return "conectado";
  if (estado.isInternetReachable === false) return "sin internet";
  return "desconocido";
}

export function useConexion(): EstadoConexion {
  const [estado, setEstado] = useState<EstadoConexion>("desconocido");
  useEffect(() => {
    const suscripcion = NetInfo.addEventListener((siguiente) => setEstado(convertir(siguiente)));
    void NetInfo.fetch().then((siguiente) => setEstado(convertir(siguiente)));
    return suscripcion;
  }, []);
  return estado;
}
