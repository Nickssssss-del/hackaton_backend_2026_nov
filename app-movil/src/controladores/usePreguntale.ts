/**
 * Controlador. D1 «Pregúntale a Vecinos».
 * Envía lo dicho a la Edge Function `preguntale`, lee la respuesta en voz alta y ejecuta en el
 * teléfono la acción que devuelve. Lo que crea algo (recordatorio, pedido de ayuda) se confirma
 * antes con «¿Lo guardo?». «Llamar» nunca marca sin un toque.
 */
import { useCallback, useEffect, useState } from "react";
import { guardarJson, leerJson } from "../modelos/almacen";
import { crearPedido } from "../modelos/pedidosRepositorio";
import { leerContactosLocales } from "../modelos/local/contactos";
import { leerPerfilLocal } from "../modelos/local/perfil";
import { horaLegible, nuevoId } from "../modelos/local/pastillas";
import { leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import { preguntar, type RespuestaPreguntale, type ServicioEncontrado } from "../modelos/preguntaleRepositorio";
import { asegurarSesionAnonima } from "../modelos/supabase";
import { etiquetaCategoriaAyuda } from "../modelos/categoriasAyuda";
import type { CategoriaPedido } from "../modelos/tipos";
import { mensajeDeError } from "./errores";
import { guardarPastillaConAviso, prepararAvisos } from "./recordatorios";
import { escribir, faltaParaEscribir, sinBase } from "./useAyudaVecinos";
import { useConexion } from "./useConexion";
import { useEscuchar } from "./useEscuchar";

const CLAVE_ACEPTO = "preguntale_acepto";
const CATEGORIAS: readonly CategoriaPedido[] = ["arreglos", "compras", "transporte", "salud", "desastre_natural", "apoyo"];

/** Una burbuja del chat (Mockup v4, p. 15): lo que dijo la persona o la respuesta de Vecinos. */
export interface MensajeChat {
  id: string;
  de: "yo" | "vecinos";
  texto: string;
  respuesta?: RespuestaPreguntale;
  /** Sin internet o con error: se muestran los botones de siempre. */
  conBotonesBase?: boolean;
}

export interface LlamadaPosible {
  etiqueta: string;
  telefono: string;
}

export function usePreguntale() {
  const conexion = useConexion();
  const voz = useEscuchar();
  const [aceptado, setAceptado] = useState<boolean | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaPreguntale | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const agregar = useCallback((m: Omit<MensajeChat, "id">) => {
    setMensajes((lista) => [...lista, { ...m, id: `${Date.now()}-${lista.length}` }]);
  }, []);

  useEffect(() => {
    void leerJson<boolean>(CLAVE_ACEPTO, false).then(setAceptado);
  }, []);

  const aceptar = useCallback(async () => {
    await guardarJson(CLAVE_ACEPTO, true);
    setAceptado(true);
  }, []);

  const hablar = useCallback((texto: string) => void voz.escuchar(texto, true), [voz]);

  const enviar = useCallback(
    async (texto: string) => {
      const limpio = texto.trim();
      setError(null);
      setHecho(null);
      if (!limpio) {
        setError("Dime o escribe qué necesitas.");
        return;
      }
      agregar({ de: "yo", texto: limpio });
      if (limpio.length > 300) {
        setError("Dilo de nuevo, más corto.");
        return;
      }
      const faltaServidor = sinBase();
      if (faltaServidor) {
        setError(faltaServidor);
        agregar({ de: "vecinos", texto: faltaServidor, conBotonesBase: true });
        return;
      }
      if (conexion === "sin internet") {
        const texto = "Necesito internet para responderte. Mientras tanto, elige una opción.";
        setError(texto);
        setRespuesta(null);
        agregar({ de: "vecinos", texto, conBotonesBase: true });
        return;
      }
      setCargando(true);
      try {
        await asegurarSesionAnonima();
        const [perfil, ubicacion] = await Promise.all([leerPerfilLocal(), leerUltimaUbicacion()]);
        const r = await preguntar({
          texto: limpio,
          lat: ubicacion?.lat ?? perfil?.lat,
          lng: ubicacion?.lng ?? perfil?.lng,
          zonaId: perfil?.zonaId,
        });
        setRespuesta(r);
        agregar({ de: "vecinos", texto: r.texto, respuesta: r });
        hablar(r.texto);
      } catch (causa) {
        setRespuesta(null);
        const texto = mensajeDeError(causa, "general");
        setError(texto);
        agregar({ de: "vecinos", texto, conBotonesBase: true });
      } finally {
        setCargando(false);
      }
    },
    [conexion, hablar, agregar],
  );

  /** crear_recordatorio, ya confirmado: una pastilla o aviso diario a esa hora (INC-21: todo es diario). */
  const guardarRecordatorio = useCallback(async (args: Record<string, unknown>) => {
    const que = typeof args.que === "string" && args.que.trim() ? args.que.trim().slice(0, 60) : "Recordatorio";
    const hora = typeof args.hora === "string" && /^\d{2}:\d{2}$/.test(args.hora) ? args.hora : null;
    if (!hora) {
      setError("No entendí la hora. Agrégalo en Pastillas.");
      return false;
    }
    await prepararAvisos();
    await guardarPastillaConAviso({
      id: nuevoId(),
      nombre: que,
      cantidad: 1,
      hora,
      aviso: { sonido: true, voz: true, vibracion: true },
    });
    // Texto del Mockup v4 (p. 15): «Listo. Te aviso a las 8:00 p. m. con sonido y voz.»
    const mensaje = args.repetir === "una_vez"
      ? `Listo. Te aviso a las ${horaLegible(hora)} con sonido y voz. Se repetirá cada día; puedes quitarlo en Pastillas.`
      : `Listo. Te aviso a las ${horaLegible(hora)} con sonido y voz.`;
    setHecho(mensaje);
    agregar({ de: "vecinos", texto: mensaje, respuesta: { texto: mensaje, funcion: "ver_mi_horario", argumentos: {}, confirmar: false, servicios: [], botones: [] } });
    hablar(mensaje);
    return true;
  }, [hablar, agregar]);

  /** pedir_ayuda, ya confirmado. Devuelve "celular" si primero hay que pedir el celular. */
  const guardarPedido = useCallback(async (args: Record<string, unknown>): Promise<"ok" | "celular" | "error"> => {
    const categoria = CATEGORIAS.includes(args.categoria as CategoriaPedido) ? (args.categoria as CategoriaPedido) : "transporte";
    const descripcion = typeof args.descripcion === "string" && args.descripcion.trim()
      ? args.descripcion.trim().slice(0, 140)
      : `Necesito ayuda: ${etiquetaCategoriaAyuda(categoria).toLowerCase()}`;
    const falta = await faltaParaEscribir();
    if (falta === "celular") return "celular";
    if (falta === "registro") {
      setError("Primero elige tu barrio: Mis datos › Mi barrio.");
      return "error";
    }
    const problema = await escribir(conexion !== "sin internet", () => crearPedido({ categoria, descripcion }));
    if (problema) {
      setError(problema);
      return "error";
    }
    const mensaje = "Listo. Tus vecinos ya ven tu pedido.";
    setHecho(mensaje);
    agregar({ de: "vecinos", texto: mensaje });
    hablar(mensaje);
    return "ok";
  }, [conexion, hablar, agregar]);

  /** llamar: a quién se puede llamar según lo pedido. Nunca marca: la vista muestra un botón. */
  const resolverLlamada = useCallback(async (args: Record<string, unknown>, servicios: ServicioEncontrado[]): Promise<LlamadaPosible[]> => {
    if (typeof args.servicio_id === "string") {
      const s = servicios.find((x) => x.id === args.servicio_id);
      return s?.contacto ? [{ etiqueta: `Llamar a ${s.nombre}`, telefono: s.contacto }] : [];
    }
    const contactos = await leerContactosLocales();
    const buscado = normalizarTexto(typeof args.a_quien === "string" ? args.a_quien : "").replace(/^(a |mi |mis )+/, "");
    const coincide = contactos.filter((c) => {
      const nombre = normalizarTexto(c.nombre);
      const relacion = normalizarTexto(c.relacion);
      return buscado.length > 0 && (nombre.includes(buscado) || buscado.includes(nombre) || (relacion && (relacion.includes(buscado) || buscado.includes(relacion))));
    });
    const lista = coincide.length > 0 ? coincide : contactos;
    return lista.map((c) => ({ etiqueta: `Llamar a ${c.nombre}${c.relacion ? ` (${c.relacion})` : ""}`, telefono: c.telefono }));
  }, []);

  return {
    aceptado,
    aceptar,
    mensajes,
    respuesta,
    cargando,
    error,
    hecho,
    enviar,
    guardarRecordatorio,
    guardarPedido,
    resolverLlamada,
    hablar,
    limpiar: () => {
      setRespuesta(null);
      setError(null);
      setHecho(null);
      setMensajes([]);
    },
  };
}

/** como_llegar: URL de Google Maps a pie; null si no hay a dónde. */
export function urlComoLlegarPreguntale(args: Record<string, unknown>, servicios: ServicioEncontrado[]): string | null {
  if (typeof args.servicio_id === "string") {
    const s = servicios.find((x) => x.id === args.servicio_id);
    if (s && s.lat !== null && s.lng !== null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking`;
    }
  }
  if (typeof args.destino === "string" && args.destino.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(args.destino.trim())}`;
  }
  return null;
}

function normalizarTexto(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
