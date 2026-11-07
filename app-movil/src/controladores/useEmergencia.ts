/**
 * Controlador. La emergencia no depende de la nube.
 * Prepara el SMS, lee las instrucciones y muestra el punto seguro.
 */
import { Contact, ContactField, requestPermissionsAsync } from "expo-contacts";
import * as Location from "expo-location";
import * as SMS from "expo-sms";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useState } from "react";
import { distanciaMetros, minutosAPie, rumbo } from "../modelos/distancia";
import {
  guardarEmergencia,
  leerEmergencia,
  pasosEmergencia,
  puntosSeguros,
} from "../modelos/emergenciaBase";
import type { FichaEmergencia } from "../modelos/tipos";
import { mensajeDeError, revisarTexto } from "./errores";

export function useEmergencia() {
  const [ficha, setFicha] = useState<FichaEmergencia | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [punto, setPunto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      setFicha(await leerEmergencia());
      setError(null);
    } catch (causa) {
      setError(mensajeDeError(causa));
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const guardar = async (siguiente: FichaEmergencia) => {
    const invalido = revisarTexto(siguiente.mensaje, false);
    if (invalido) {
      setError(invalido);
      return;
    }
    try {
      await guardarEmergencia(siguiente);
      setFicha(siguiente);
      setError(null);
    } catch (causa) {
      setError(mensajeDeError(causa));
    }
  };

  const elegirContacto = async () => {
    try {
      const permiso = await requestPermissionsAsync();
      if (!permiso.granted) {
        setError("Autoriza el acceso a tus contactos para elegirlos.");
        return;
      }
      const elegido = await Contact.presentPicker();
      if (!elegido) return;
      const detalles = await elegido.getDetails([ContactField.FULL_NAME, ContactField.PHONES]);
      const telefono = detalles.phones?.[0]?.number?.replace(/[^\d+]/g, "") ?? "";
      if (!telefono) {
        setError("Ese contacto no tiene teléfono.");
        return;
      }
      const actual = ficha ?? (await leerEmergencia());
      if (actual.contactos.length >= 2) {
        setError("La emergencia avisa a dos contactos. Quita uno para cambiarlo.");
        return;
      }
      await guardar({
        ...actual,
        contactos: [...actual.contactos, { nombre: detalles.fullName || "Contacto", telefono }],
      });
    } catch (causa) {
      setError(mensajeDeError(causa));
    }
  };

  const quitarContacto = async (telefono: string) => {
    const actual = ficha ?? (await leerEmergencia());
    await guardar({
      ...actual,
      contactos: actual.contactos.filter((contacto) => contacto.telefono !== telefono),
    });
  };

  const ubicacion = async () => {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) return null;
    const posicion = await Location.getCurrentPositionAsync({});
    return {
      lat: Number(posicion.coords.latitude.toFixed(3)),
      lng: Number(posicion.coords.longitude.toFixed(3)),
    };
  };

  const avisar = async () => {
    const actual = await leerEmergencia();
    setFicha(actual);
    if (actual.contactos.length === 0) {
      setError("Agrega un contacto de emergencia en este teléfono.");
      setAviso(null);
      return;
    }
    const aqui = await ubicacion();
    const donde = aqui ? `${aqui.lat}, ${aqui.lng}` : "zona guardada en el teléfono";
    const texto = `Necesito ayuda. Estoy en ${donde}. ${actual.mensaje}`.trim();
    const numeros = actual.contactos.slice(0, 2).map((contacto) => contacto.telefono);
    const disponible = await SMS.isAvailableAsync();
    if (!disponible) {
      setAviso(`Tu mensaje está listo: ${texto}`);
      return;
    }
    await SMS.sendSMSAsync(numeros, texto);
    setError(null);
    setAviso("Tu mensaje está listo: toca Enviar en Mensajes.");
  };

  const escuchar = () => {
    Speech.speak(pasosEmergencia.join(". "), { language: "es-PE" });
  };

  const hayPeligro = async () => {
    const aqui = await ubicacion();
    if (!aqui) {
      setPunto(puntosSeguros[0] ? puntosSeguros[0].nombre : null);
      return;
    }
    const cercano = [...puntosSeguros].sort(
      (a, b) =>
        distanciaMetros(aqui.lat, aqui.lng, a.lat, a.lng) -
        distanciaMetros(aqui.lat, aqui.lng, b.lat, b.lng),
    )[0];
    if (!cercano) return;
    const metros = distanciaMetros(aqui.lat, aqui.lng, cercano.lat, cercano.lng);
    setPunto(
      `${cercano.nombre}: ≈ ${minutosAPie(metros)} min a pie hacia el ${rumbo(aqui.lat, aqui.lng, cercano.lat, cercano.lng)}.`,
    );
    setAviso(null);
  };

  return { ficha, aviso, punto, error, guardar, avisar, escuchar, hayPeligro, elegirContacto, quitarContacto };
}
