/**
 * Controlador. Registra la emergencia de G2 en la base, avisa a los vecinos y escucha quién va.
 *
 * Regla de oro: nada de esto puede frenar la emergencia local. Cada paso tiene tiempo máximo y
 * cualquier error se traga en silencio; las llamadas y el SMS siguen saliendo del teléfono.
 * - iniciar(): emergencias + eslabones + enlace «Voy en camino» + alerta-vecinos (inicio) + Realtime.
 * - sincronizarPasos(): el estado de cada llamada pasa a su eslabón.
 * - esperarEnlace(): el SMS espera unos segundos el enlace; si no llega, sale sin él.
 * - cerrar(): cerrar_emergencia + alerta-vecinos (cierre).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  actualizarEslabon,
  avisarVecinos,
  cerrarEmergencia,
  crearEmergencia,
  crearEnlace,
  crearEslabones,
  escucharAyudaEnCamino,
  leerAyudaEnCamino,
  urlVoyEnCamino,
  type EstadoEslabon,
} from "../modelos/emergenciaNubeRepositorio";
import type { EstadoPaso, PasoCascada } from "../modelos/cascadaEmergencia";
import { leerPerfilLocal } from "../modelos/local/perfil";
import { guardarPerfilNube } from "../modelos/perfilRepositorio";
import { asegurarSesionAnonima, tieneConfiguracionSupabase } from "../modelos/supabase";
import type { UltimaUbicacion } from "../modelos/tipos";
import { codigoDeError } from "./errores";
import { useConexion } from "./useConexion";

const TIEMPO_MAXIMO = 8000;
/**
 * alerta-vecinos puede tardar más (arranque en frío de la Edge Function + envío a Expo). No frena
 * nada (no se espera), y la base solo deja avisar una vez (reclamar_aviso): si se cortaba a los 8 s,
 * los vecinos SÍ recibían el aviso pero A nunca veía «1 vecino puede ver dónde estás».
 */
const TIEMPO_AVISO_VECINOS = 45000;
/** Contador de quién va: además de Realtime, se relee cada 10 s. */
const RELEER_MS = 10000;

export type EstadoNube = "inactiva" | "registrando" | "registrada" | "sin_conexion" | "no_disponible" | "limite";

const ESTADO_ESLABON: Partial<Record<EstadoPaso, EstadoEslabon>> = {
  espera: "pendiente",
  llamando: "llamando",
  no_contesto: "no_contesto",
  viene: "va_en_camino",
};

function conTiempoMaximo<T>(promesa: Promise<T>, maximo = TIEMPO_MAXIMO): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, rechazar) => {
      setTimeout(() => rechazar(new Error("TIEMPO_AGOTADO")), maximo);
    }),
  ]);
}

export function useEmergenciaNube() {
  const conexion = useConexion();
  const [estado, setEstado] = useState<EstadoNube>("inactiva");
  const [emergenciaId, setEmergenciaId] = useState<string | null>(null);
  const [vecinosAvisados, setVecinosAvisados] = useState<number | null>(null);
  const [vecinosEnCamino, setVecinosEnCamino] = useState(0);
  const [contactosEnCamino, setContactosEnCamino] = useState<string[]>([]);
  const enlace = useRef<string | null>(null);
  const esperandoEnlace = useRef<Promise<string | null> | null>(null);
  const eslabones = useRef<Record<number, string>>({});
  const ultimoEstado = useRef<Record<number, EstadoEslabon>>({});
  const iniciada = useRef(false);
  const pasosRecientes = useRef<PasoCascada[]>([]);
  const idRef = useRef<string | null>(null);

  const sincronizarUno = useCallback(async (orden: number, estadoPaso: EstadoPaso) => {
    const id = eslabones.current[orden];
    const siguiente = ESTADO_ESLABON[estadoPaso];
    if (!id || !siguiente || ultimoEstado.current[orden] === siguiente) return;
    ultimoEstado.current[orden] = siguiente;
    await conTiempoMaximo(actualizarEslabon(id, siguiente)).catch(() => undefined);
  }, []);

  const iniciar = useCallback(
    (pasos: PasoCascada[], obtenerUbicacion: () => Promise<UltimaUbicacion | null>) => {
      pasosRecientes.current = pasos;
      if (iniciada.current) return;
      iniciada.current = true;
      if (!tieneConfiguracionSupabase()) {
        setEstado("no_disponible");
        return;
      }
      if (conexion === "sin internet") {
        setEstado("sin_conexion");
        return;
      }
      setEstado("registrando");

      const trabajo = (async (): Promise<string | null> => {
        await conTiempoMaximo(asegurarSesionAnonima());
        const perfil = await leerPerfilLocal();
        // La emergencia necesita la fila del perfil (y copia su alerta_vecinal).
        if (perfil) await conTiempoMaximo(guardarPerfilNube(perfil)).catch(() => undefined);
        const coord = await conTiempoMaximo(obtenerUbicacion()).catch(() => null);
        const d = perfil?.direccion;
        const direccion = d ? [d.calle, d.numero, d.referencia].filter((x) => x?.trim()).join(" ") : undefined;
        const creada = await conTiempoMaximo(
          crearEmergencia({ nombre: perfil?.nombre, direccion, lat: coord?.lat, lng: coord?.lng }),
        );
        idRef.current = creada.id;
        setEmergenciaId(creada.id);

        eslabones.current = await conTiempoMaximo(crearEslabones(creada.id, pasos.map((p) => p.titulo))).catch(() => ({}));
        // Se sincroniza con los pasos MÁS RECIENTES: la cascada pudo avanzar mientras se creaba.
        pasosRecientes.current.slice(0, 5).forEach((p, k) => {
          ultimoEstado.current[k + 1] = "pendiente";
          void sincronizarUno(k + 1, p.estado);
        });

        // Un solo enlace para el SMS grupal; si hay una sola persona de confianza, se ata a su eslabón.
        const personales = pasos.map((p, k) => ({ p, orden: k + 1 })).filter((x) => x.p.tipo === "contacto");
        const nombres = personales.map((x) => x.p.titulo).join(" y ") || "Contactos";
        const eslabon = personales.length === 1 ? eslabones.current[personales[0].orden] : undefined;
        const token = await conTiempoMaximo(crearEnlace(creada.id, nombres, eslabon)).catch(() => null);
        enlace.current = token ? urlVoyEnCamino(token) : null;

        if (creada.avisarVecinos) {
          void conTiempoMaximo(avisarVecinos(creada.id, "inicio"), TIEMPO_AVISO_VECINOS)
            .then(setVecinosAvisados)
            .catch(() => setVecinosAvisados(null));
        }
        setEstado("registrada");
        return enlace.current;
      })().catch((causa) => {
        setEstado(codigoDeError(causa) === "LIMITE_EMERGENCIAS" ? "limite" : "no_disponible");
        return null;
      });
      esperandoEnlace.current = trabajo;
    },
    [conexion, sincronizarUno],
  );

  const sincronizarPasos = useCallback(
    (pasos: PasoCascada[]) => {
      pasosRecientes.current = pasos;
      pasos.slice(0, 5).forEach((p, k) => void sincronizarUno(k + 1, p.estado));
    },
    [sincronizarUno],
  );

  /** URL «Voy en camino» para el SMS. Espera como máximo `ms` a que se cree; si no, null. */
  const esperarEnlace = useCallback(async (ms = 4000): Promise<string | null> => {
    if (enlace.current) return enlace.current;
    if (!esperandoEnlace.current) return null;
    return Promise.race([esperandoEnlace.current, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
  }, []);

  const cerrar = useCallback(async () => {
    // Si se cancela mientras la emergencia aún se registra, se espera a tener su id para cerrarla
    // (si no, quedaba activa 2 h y los vecinos no veían «Esta emergencia ya terminó»).
    if (!idRef.current && esperandoEnlace.current) {
      await Promise.race([esperandoEnlace.current, new Promise((r) => setTimeout(r, 20000))]).catch(() => undefined);
    }
    const id = idRef.current;
    if (!id) return;
    idRef.current = null;
    try {
      await conTiempoMaximo(cerrarEmergencia(id));
      await conTiempoMaximo(avisarVecinos(id, "cierre"), TIEMPO_AVISO_VECINOS).catch(() => undefined);
    } catch {
      // Si no se pudo, la base la cierra sola a las 2 horas.
    }
  }, []);

  // Realtime: contador de vecinos que van y contactos que abrieron «Voy en camino».
  useEffect(() => {
    if (!emergenciaId) return;
    let activo = true;
    const leer = () =>
      void leerAyudaEnCamino(emergenciaId)
        .then((r) => {
          if (!activo) return;
          setVecinosEnCamino(r.vecinosEnCamino);
          setContactosEnCamino(r.contactosEnCamino);
        })
        .catch(() => undefined);
    leer();
    let dejar: () => void = () => undefined;
    try {
      dejar = escucharAyudaEnCamino(emergenciaId, leer);
    } catch {
      // Sin Realtime, se relee cada 10 s.
    }
    const intervalo = setInterval(leer, RELEER_MS);
    return () => {
      activo = false;
      clearInterval(intervalo);
      dejar();
    };
  }, [emergenciaId]);

  return {
    estado,
    emergenciaId,
    vecinosAvisados,
    vecinosEnCamino,
    contactosEnCamino,
    iniciar,
    sincronizarPasos,
    esperarEnlace,
    cerrar,
  };
}
