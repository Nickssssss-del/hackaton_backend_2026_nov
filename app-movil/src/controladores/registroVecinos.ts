/**
 * Controlador. Registro del Mockup v4 (A1–A6).
 * Todo se guarda en el teléfono al avanzar de pantalla, para que «Volver» no pierda datos.
 * A la nube solo va la ubicación aproximada (3 decimales) y la zona, cuando hay internet.
 */
import * as Contacts from "expo-contacts/legacy";
import * as Location from "expo-location";
import type { ModoUso } from "../modelos/local/preferencias";
import { guardarContactosLocales, leerContactosLocales } from "../modelos/local/contactos";
import { guardarPerfilLocal, leerPerfilLocal } from "../modelos/local/perfil";
import { guardarEstadoRegistro, leerEstadoRegistro } from "../modelos/local/registro";
import { guardarUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import { guardarUbicacionNube } from "../modelos/perfilRepositorio";
import { asegurarSesionAnonima, tieneConfiguracionSupabase } from "../modelos/supabase";
import type { ContactoLocal, DireccionLocal, Genero, PerfilLocal } from "../modelos/tipos";

export {
  datosFaltantesDireccion,
  EDAD_INICIAL,
  EDAD_MAXIMA,
  EDAD_MINIMA,
  interpretarContactoDictado,
  MAX_CONTACTOS,
  nombreValido,
  normalizarCelular,
} from "../modelos/validacionRegistro";
import { MAX_CONTACTOS, normalizarCelular } from "../modelos/validacionRegistro";
const TIEMPO_MAXIMO_UBICACION = 10000;

/** Ruta del Inicio según el modo (A2). B1/B2 se construyen en la fase de Inicios. */
export function rutaInicio(modo: ModoUso | null): "/inicio" {
  // Modo sencillo → Inicio del adulto mayor (B1); completo → Inicio del vecino (B2).
  // Mientras B1/B2 no existan, ambos abren el Inicio actual.
  void modo;
  return "/inicio";
}

export async function registroCompleto(): Promise<boolean> {
  return (await leerEstadoRegistro()).completo;
}

export async function leerPerfil(): Promise<PerfilLocal> {
  return (await leerPerfilLocal()) ?? {};
}

async function actualizarPerfil(cambios: Partial<PerfilLocal>): Promise<void> {
  const actual = await leerPerfil();
  await guardarPerfilLocal({ ...actual, ...cambios });
}

// ---------- A3 · ¿Dónde vives? ----------

export type ResultadoUbicacion =
  | { estado: "ok"; calle: string; numero: string }
  | { estado: "denegado" }
  | { estado: "sin_senal" };

function conTiempoMaximo<T>(promesa: Promise<T>, maximo: number): Promise<T | null> {
  return Promise.race([promesa, new Promise<null>((resolve) => setTimeout(() => resolve(null), maximo))]);
}

/**
 * «Usar mi ubicación»: pide permiso (solo en primer plano), toma las coordenadas,
 * intenta convertirlas en calle y número, y guarda todo en el teléfono.
 * La persona confirma o corrige la dirección en A3.1 («Sí, aquí vivo», INC-02).
 */
export async function ubicarDomicilio(): Promise<ResultadoUbicacion> {
  try {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) return { estado: "denegado" };
    const posicion = await conTiempoMaximo(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      TIEMPO_MAXIMO_UBICACION,
    );
    if (!posicion) return { estado: "sin_senal" };
    const { latitude: lat, longitude: lng } = posicion.coords;

    await actualizarPerfil({ lat, lng });
    await guardarUltimaUbicacion({ lat, lng, fecha: new Date().toISOString() });
    void enviarUbicacionAproximada(lat, lng);

    let calle = "";
    let numero = "";
    try {
      const [lugar] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      calle = lugar?.street ?? "";
      numero = lugar?.streetNumber ?? "";
    } catch {
      // Sin servicio de direcciones: la persona escribe o dicta la calle en A3.1.
    }
    return { estado: "ok", calle, numero };
  } catch {
    return { estado: "sin_senal" };
  }
}

/** Sube zona + coordenadas a 3 decimales. Si no hay internet o falla, la app sigue. */
async function enviarUbicacionAproximada(lat: number, lng: number): Promise<void> {
  if (!tieneConfiguracionSupabase()) return;
  try {
    await asegurarSesionAnonima();
    const zonaId = await guardarUbicacionNube(lat, lng);
    if (zonaId) await actualizarPerfil({ zonaId });
  } catch {
    // Se reintentará cuando la persona publique o pida ayuda.
  }
}

// ---------- A3.1 · Tu dirección ----------

export async function guardarDireccion(direccion: DireccionLocal): Promise<void> {
  await actualizarPerfil({
    direccion: {
      calle: direccion.calle.trim(),
      numero: direccion.numero.trim(),
      referencia: direccion.referencia.trim(),
    },
  });
  await guardarEstadoRegistro({ direccionOmitida: false });
}

export async function omitirDireccion(): Promise<void> {
  await guardarEstadoRegistro({ direccionOmitida: true });
}

// ---------- A4 · Tus datos ----------

export async function guardarDatos(nombre: string, edad: number, genero: Genero | undefined): Promise<void> {
  await actualizarPerfil({ nombre: nombre.trim(), edad, genero });
}

// ---------- A5 · ¿A quién llamamos? ----------

export type ResultadoAgenda =
  | { estado: "encontrado"; nombre: string; telefono: string }
  | { estado: "no_encontrado" }
  | { estado: "sin_permiso" };

/** Busca en la agenda del teléfono un contacto con ese nombre y un celular válido. */
export async function buscarEnAgenda(nombre: string): Promise<ResultadoAgenda> {
  if (!nombre.trim()) return { estado: "no_encontrado" };
  try {
    const permiso = await Contacts.requestPermissionsAsync();
    if (!permiso.granted) return { estado: "sin_permiso" };
    const { data } = await Contacts.getContactsAsync({
      name: nombre.trim(),
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });
    for (const contacto of data) {
      for (const tel of contacto.phoneNumbers ?? []) {
        const celular = normalizarCelular(tel.number ?? tel.digits ?? "");
        if (celular) return { estado: "encontrado", nombre: contacto.name ?? nombre, telefono: celular };
      }
    }
    return { estado: "no_encontrado" };
  } catch {
    return { estado: "sin_permiso" };
  }
}

export function leerContactos(): Promise<ContactoLocal[]> {
  return leerContactosLocales();
}

export async function guardarContactos(contactos: ContactoLocal[]): Promise<void> {
  await guardarContactosLocales(contactos.slice(0, MAX_CONTACTOS));
}

// ---------- A6 · ¡Todo listo! ----------

export async function completarRegistro(): Promise<void> {
  await guardarEstadoRegistro({ completo: true, completadoEn: new Date().toISOString() });
}
