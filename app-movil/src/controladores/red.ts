/**
 * Controlador. Revisa la red antes de llamar a la base.
 */
import NetInfo from "@react-native-community/netinfo";

export async function exigirInternet(): Promise<void> {
  const estado = await NetInfo.fetch();
  if (estado.isInternetReachable !== true) throw new Error("SIN_INTERNET");
}
