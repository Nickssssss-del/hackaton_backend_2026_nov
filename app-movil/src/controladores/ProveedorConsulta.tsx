/**
 * Controlador. Copia del directorio para verla sin señal.
 * La vista no toca AsyncStorage.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
    },
  },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage });

export function ProveedorConsulta({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider client={cliente} persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  );
}

export { cliente as consultaCliente };
