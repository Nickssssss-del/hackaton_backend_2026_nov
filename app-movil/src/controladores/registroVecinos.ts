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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { guardarJson, leerJson, PREFIJO } from "../modelos/almacen";
import { cancelarTodosLosAvisos } from "./recordatorios";
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

/**
 * Ruta del Inicio según el modo (A2). Una sola pantalla, /principal, muestra
 * B1 (modo sencillo → adulto mayor) o B2 (modo completo → vecino).
 */
export function rutaInicio(modo: ModoUso | null): "/principal" {
  void modo;
  return "/principal";
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

/** Mis datos › Mi avatar. null vuelve a «automático» (según edad y género). */
export async function guardarAvatar(avatar: PerfilLocal["avatar"] | null): Promise<void> {
  const actual = await leerPerfil();
  const { avatar: _anterior, ...resto } = actual;
  await guardarPerfilLocal(avatar ? { ...resto, avatar } : resto);
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

export type ResultadoListaAgenda =
  | { estado: "lista"; contactos: { nombre: string; telefono: string }[] }
  | { estado: "sin_permiso" };

/** Contactos de la agenda con un celular peruano válido (uno por persona), en orden alfabético. */
export async function listarAgenda(): Promise<ResultadoListaAgenda> {
  try {
    const permiso = await Contacts.requestPermissionsAsync();
    if (!permiso.granted) return { estado: "sin_permiso" };
    const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers] });
    const vistos = new Set<string>();
    const contactos: { nombre: string; telefono: string }[] = [];
    for (const contacto of data) {
      for (const tel of contacto.phoneNumbers ?? []) {
        const celular = normalizarCelular(tel.number ?? tel.digits ?? "");
        if (celular && !vistos.has(celular)) {
          vistos.add(celular);
          contactos.push({ nombre: (contacto.name ?? "").trim() || celular, telefono: celular });
          break;
        }
      }
    }
    contactos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return { estado: "lista", contactos };
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

// ---------- Cerrar sesión en este teléfono ----------

/**
 * Borra del teléfono el registro, el perfil, los contactos, la ficha, las pastillas y demás datos
 * locales (claves «barrio.*»), y cancela los avisos programados. Conserva solo el tamaño de letra
 * y el modo oscuro. No toca la nube: lo publicado se queda (para borrarlo está «Borrar mis datos»).
 * Después la app vuelve a la bienvenida (A1) para registrarse de nuevo.
 */
export async function cerrarSesionLocal(): Promise<void> {
  const preferencias = await leerJson<{ tamano?: string; oscuro?: boolean }>("preferencias", {});
  try {
    const claves = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIJO));
    await AsyncStorage.multiRemove(claves);
  } catch {
    // Si falla, al menos se marca el registro como no completo.
  }
  await guardarJson("preferencias", { tamano: preferencias.tamano, oscuro: preferencias.oscuro });
  await guardarEstadoRegistro({ completo: false });
  await cancelarTodosLosAvisos();
}

// ---------- A6 · ¡Todo listo! ----------

export async function completarRegistro(): Promise<void> {
  await guardarEstadoRegistro({ completo: true, completadoEn: new Date().toISOString() });
}
