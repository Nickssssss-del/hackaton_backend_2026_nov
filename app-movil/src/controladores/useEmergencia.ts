import * as Location from "expo-location";
import * as Linking from "expo-linking";
import * as SMS from "expo-sms";
import { useCallback, useEffect, useMemo, useState } from "react";
import baseIncluida from "../../assets/emergencia/base.json";
import instruccionesIncluidas from "../../assets/emergencia/instrucciones.json";
import puntosIncluidos from "../../assets/emergencia/puntos_seguros.json";
import { distanciaMetros, minutosAPie, rumbo, type PuntoSeguro } from "../modelos/geo";
import {
  contactoLocalDesdeTelefono,
  guardarContactosLocales,
  leerContactosLocales,
} from "../modelos/local/contactos";
import { leerCacheGrupos } from "../modelos/local/cacheGrupos";
import { guardarEmergencia, leerEmergencia } from "../modelos/local/emergenciaBase";
import { leerFicha } from "../modelos/local/ficha";
import { leerPerfilLocal } from "../modelos/local/perfil";
import { guardarUltimaUbicacion, leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import {
  armarMensajeEmergencia,
  armarMensajeEstoyBien,
  type CoordenadaEmergencia,
} from "../modelos/mensajeEmergencia";
import type { ContactoLocal, FichaEmergencia, GrupoApoyoPublico, UltimaUbicacion } from "../modelos/tipos";
import { useConexion } from "./useConexion";

const TIEMPO_MAXIMO_UBICACION = 8000;

type NumeroEmergencia = { nombre: string; telefono: string };
type ResultadoAyuda =
  | { estado: "pedir_numero" }
  | { estado: "mensaje_listo"; mensaje: string; telefonos: string[]; smsDisponible: boolean };
type PuntoSeguroCercano = PuntoSeguro & { minutos: number; rumbo: string };

function conTiempoMaximo<T>(promesa: Promise<T>, maximo: number): Promise<T | null> {
  return Promise.race([
    promesa,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), maximo);
    }),
  ]);
}

function numeroValido(telefono: string): boolean {
  return /^9\d{8}$/.test(telefono);
}

function telefonosDe(contactos: ContactoLocal[], brigada: GrupoApoyoPublico | null): string[] {
  return [...contactos.map((contacto) => contacto.telefono), brigada?.contacto ?? ""].filter(Boolean);
}

async function leerFichaConRespaldo(): Promise<FichaEmergencia> {
  const ficha = await leerFicha();
  if (ficha.mensaje.trim() || ficha.contactos.length > 0 || ficha.consentimiento) return ficha;
  return leerEmergencia();
}

export function useEmergencia() {
  const estadoConexion = useConexion();
  const [ficha, setFicha] = useState<FichaEmergencia | null>(null);
  const [contactos, setContactos] = useState<ContactoLocal[]>([]);
  const [brigada, setBrigada] = useState<GrupoApoyoPublico | null>(null);
  const [ubicacion, setUbicacion] = useState<UltimaUbicacion | null>(null);
  const [estasEn, setEstasEn] = useState("tu ubicación");
  const [aviso, setAviso] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [telefonosAviso, setTelefonosAviso] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  const numeros = useMemo<NumeroEmergencia[]>(
    () => (baseIncluida.numeros ?? []).map((numero) => ({ nombre: numero.nombre, telefono: numero.telefono })),
    [],
  );
  const instrucciones = instruccionesIncluidas.pasos;
  const estadoInstrucciones = "por validar";
  const puntosSeguros = puntosIncluidos.puntos;

  const cargarDatos = useCallback(async () => {
    const fichaLocal = await leerFichaConRespaldo();
    const [contactosLocales, cache, perfil, ultima] = await Promise.all([
      leerContactosLocales(),
      leerCacheGrupos(),
      leerPerfilLocal(),
      leerUltimaUbicacion(),
    ]);
    setFicha(fichaLocal);
    setContactos(contactosLocales);
    setUbicacion(ultima);
    const brigadaBase = (
      baseIncluida as typeof baseIncluida & { brigada?: GrupoApoyoPublico }
    ).brigada;
    const copiaBrigada =
      cache.grupos.find(
        (grupo) =>
          grupo.tipo === "brigada" &&
          grupo.verificada &&
          (!perfil?.zonaId || grupo.zonaId === perfil.zonaId),
      ) ??
      (brigadaBase?.tipo === "brigada" && brigadaBase.verificada ? brigadaBase : null);
    setBrigada(copiaBrigada);
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const actualizarEstasEn = useCallback(
    async (coordenada: UltimaUbicacion) => {
      if (estadoConexion === "conectado") {
        const lugares = await Location.reverseGeocodeAsync({
          latitude: coordenada.lat,
          longitude: coordenada.lng,
        });
        const lugar = lugares[0];
        const nombre = [lugar?.district, lugar?.city, lugar?.region].filter(Boolean).join(", ");
        if (nombre) {
          setEstasEn(nombre);
          return;
        }
      }
      const perfil = await leerPerfilLocal();
      setEstasEn(perfil?.zonaId || `${coordenada.lat}, ${coordenada.lng}`);
    },
    [estadoConexion],
  );

  const obtenerUbicacion = useCallback(async (): Promise<UltimaUbicacion | null> => {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) return leerUltimaUbicacion();
    const posicion = await conTiempoMaximo(Location.getCurrentPositionAsync({}), TIEMPO_MAXIMO_UBICACION);
    if (!posicion) return leerUltimaUbicacion();
    const siguiente: UltimaUbicacion = {
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      fecha: new Date().toISOString(),
    };
    setUbicacion(siguiente);
    await guardarUltimaUbicacion(siguiente);
    void actualizarEstasEn(siguiente);
    return siguiente;
  }, [actualizarEstasEn]);

  const asegurarUbicacion = useCallback(async () => {
    const actual = await obtenerUbicacion();
    if (actual) return actual;
    const guardada = await leerUltimaUbicacion();
    if (guardada) setUbicacion(guardada);
    return guardada;
  }, [obtenerUbicacion]);

  const actualizarFicha = useCallback(async (siguiente: FichaEmergencia) => {
    await guardarEmergencia(siguiente);
    setFicha(siguiente);
  }, []);

  const necesitoAyuda = useCallback(async (): Promise<ResultadoAyuda> => {
    const actuales = contactos.length > 0 ? contactos : await leerContactosLocales();
    if (actuales.length === 0) return { estado: "pedir_numero" };
    const actual = ficha ?? (await leerFichaConRespaldo());
    const coordenada = await asegurarUbicacion();
    const texto = armarMensajeEmergencia({
      nombre: (await leerPerfilLocal())?.nombre,
      coord: coordenada,
      hora: new Date(),
      ficha: { texto: actual.mensaje },
      aceptoConsentimiento: actual.consentimiento?.aceptado === true,
    });
    const telefonos = telefonosDe(actuales, brigada);
    setMensaje(texto);
    setTelefonosAviso(telefonos);
    const smsDisponible = await SMS.isAvailableAsync();
    if (smsDisponible) await SMS.sendSMSAsync(telefonos, texto);
    setAviso("Tu mensaje está listo: toca Enviar en Mensajes.");
    return { estado: "mensaje_listo", mensaje: texto, telefonos, smsDisponible };
  }, [asegurarUbicacion, brigada, contactos, ficha]);

  const guardarNumeroRapido = useCallback(async (telefono: string): Promise<boolean> => {
    if (!numeroValido(telefono)) return false;
    const actuales = await leerContactosLocales();
    const siguiente = [
      contactoLocalDesdeTelefono(telefono),
      ...actuales.filter((contacto) => contacto.orden !== 1).map((contacto, indice) => ({
        ...contacto,
        orden: indice + 2,
      })),
    ].slice(0, 2);
    await guardarContactosLocales(siguiente);
    setContactos(siguiente);
    return true;
  }, []);

  const estoyBien = useCallback(async (): Promise<ResultadoAyuda> => {
    const actuales = contactos.length > 0 ? contactos : await leerContactosLocales();
    const texto = armarMensajeEstoyBien({ nombre: (await leerPerfilLocal())?.nombre });
    const telefonos = telefonosDe(actuales, brigada);
    const smsDisponible = await SMS.isAvailableAsync();
    if (smsDisponible) await SMS.sendSMSAsync(telefonos, texto);
    setMensaje(texto);
    setTelefonosAviso(telefonos);
    setAviso("Tu mensaje está listo: toca Enviar en Mensajes.");
    return { estado: "mensaje_listo", mensaje: texto, telefonos, smsDisponible };
  }, [brigada, contactos]);

  const llamar = useCallback(async (telefono: string) => {
    await Linking.openURL(`tel:${telefono.replace(/[^\d+]/g, "")}`);
  }, []);

  const puntoSeguro = useCallback(async (): Promise<PuntoSeguroCercano | null> => {
    const actual = await asegurarUbicacion();
    if (!actual) return null;
    const cercano = puntosSeguros.length > 0
      ? puntosSeguros.reduce((mejor, punto) =>
          distanciaMetros(actual.lat, actual.lng, punto.lat, punto.lng) <
          distanciaMetros(actual.lat, actual.lng, mejor.lat, mejor.lng)
            ? punto
            : mejor,
        )
      : null;
    if (!cercano) return null;
    const cuestaCaminar = ficha?.mensaje?.toLowerCase().includes("cuesta caminar") === true;
    return {
      ...cercano,
      minutos: minutosAPie(distanciaMetros(actual.lat, actual.lng, cercano.lat, cercano.lng), cuestaCaminar),
      rumbo: rumbo(actual.lat, actual.lng, cercano.lat, cercano.lng),
    };
  }, [asegurarUbicacion, ficha?.mensaje, puntosSeguros]);

  const brigadaYContactos = [...contactos, ...(brigada ? [brigada] : [])];

  return {
    ficha,
    contactos,
    brigada,
    brigadaYContactos,
    ubicacion,
    estasEn,
    numeros,
    verificadoEl: baseIncluida.verificado_el,
    instrucciones,
    estadoInstrucciones,
    aviso,
    mensaje,
    telefonosAviso,
    cargando,
    actualizarFicha,
    necesitoAyuda,
    guardarNumeroRapido,
    estoyBien,
    llamar,
    puntoSeguro,
    asegurarUbicacion,
  };
}
