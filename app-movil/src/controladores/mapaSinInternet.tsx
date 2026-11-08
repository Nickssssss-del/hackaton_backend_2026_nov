/**
 * Controlador. Mapa con y sin internet (modelos/local/cacheTeselas.ts).
 *
 * - `useTeselasMapa`: para cada tesela que pide la vista MapaOSM devuelve qué dibujar:
 *     1. la copia guardada en el teléfono (al instante, con o sin internet);
 *     2. con internet: la baja, la guarda y la muestra (la próxima vez ya está sin internet);
 *     3. sin internet y sin copia exacta: una tesela de menos zoom guardada, ampliada;
 *     4. si no hay nada: la vista deja ver el mapa dibujado de fondo (los puntos se ven igual).
 *   Con internet, si un proveedor falla o no responde en 8 s se pasa al siguiente (Esri → OSM → CARTO).
 * - `PrepararMapaSinInternet`: al abrir la app con internet (una vez al día o si cambió el lugar),
 *   deja guardado el mapa alrededor de tu casa y tu última ubicación.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { guardarJson, leerJson } from "../modelos/almacen";
import {
  guardarTesela,
  prepararMapaSinInternet,
  teselaGuardada,
  teselaMadreGuardada,
  type TeselaMadre,
} from "../modelos/local/cacheTeselas";
import { leerPerfilLocal } from "../modelos/local/perfil";
import { leerUltimaUbicacion } from "../modelos/local/ultimaUbicacion";
import { PROVEEDORES_TESELAS, type Coordenada, type Tesela } from "../modelos/mapaOSM";
import { useConexion } from "./useConexion";

export type DibujoTesela = { tipo: "imagen"; uri: string } | ({ tipo: "madre" } & TeselaMadre);

const ESPERA_PROVEEDOR_MS = 8000;

export function useTeselasMapa(teselas: Tesela[]) {
  const conexion = useConexion();
  const sinInternet = conexion === "sin internet";
  const [proveedor, setProveedor] = useState(0);
  const [bajadas, setBajadas] = useState<Record<string, string>>({});
  const [fallos, setFallos] = useState(0);
  const [version, setVersion] = useState(0);
  const pedidas = useRef(new Set<string>());
  const agotado = proveedor >= PROVEEDORES_TESELAS.length;
  const p = Math.min(proveedor, PROVEEDORES_TESELAS.length - 1);

  // Qué hay ya guardado (lectura rápida del disco; se repite al bajar teselas nuevas).
  const dibujos = useMemo(() => {
    const r: Record<string, DibujoTesela> = {};
    for (const t of teselas) {
      const local = bajadas[t.clave] ?? teselaGuardada(p, t.z, t.x, t.y);
      if (local) {
        r[t.clave] = { tipo: "imagen", uri: local };
        continue;
      }
      const madre = teselaMadreGuardada(p, t.z, t.x, t.y);
      if (madre) r[t.clave] = { tipo: "madre", ...madre };
    }
    return r;
    // `version` fuerza releer el disco tras una descarga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teselas, bajadas, p, version]);

  // Al volver internet se empieza de nuevo por el primer proveedor.
  useEffect(() => {
    if (conexion !== "conectado") return;
    setProveedor(0);
    setFallos(0);
  }, [conexion]);

  const montado = useRef(true);
  useEffect(
    () => () => {
      montado.current = false;
    },
    [],
  );

  // Con internet: bajar las que faltan del proveedor actual (cada una se pide una sola vez).
  useEffect(() => {
    if (sinInternet || agotado) return;
    for (const t of teselas) {
      if (dibujos[t.clave]?.tipo === "imagen") continue;
      const clave = `${proveedor}:${t.clave}`;
      if (pedidas.current.has(clave)) continue;
      pedidas.current.add(clave);
      void guardarTesela(proveedor, t.z, t.x, t.y).then((uri) => {
        if (!montado.current) return;
        if (uri) {
          setBajadas((b) => ({ ...b, [t.clave]: uri }));
          setVersion((v) => v + 1);
        } else {
          // Se puede volver a pedir cuando cambie la conexión.
          pedidas.current.delete(clave);
          setFallos((f) => f + 1);
        }
      });
    }
  }, [teselas, dibujos, proveedor, sinInternet, agotado]);

  const faltan = teselas.filter((t) => dibujos[t.clave]?.tipo !== "imagen").length;

  // Muchos fallos con internet: siguiente proveedor.
  useEffect(() => {
    if (sinInternet || agotado || teselas.length === 0) return;
    if (fallos >= Math.max(1, Math.ceil(teselas.length / 2))) {
      setProveedor((x) => x + 1);
      setFallos(0);
    }
  }, [fallos, teselas.length, sinInternet, agotado]);

  // Con internet, si en 8 s no llegó nada y faltan todas: siguiente proveedor.
  useEffect(() => {
    if (sinInternet || agotado || teselas.length === 0 || faltan < teselas.length) return;
    const t = setTimeout(() => {
      setProveedor((x) => x + 1);
      setFallos(0);
    }, ESPERA_PROVEEDOR_MS);
    return () => clearTimeout(t);
  }, [sinInternet, agotado, faltan, teselas.length, proveedor]);

  const hayAlgo = Object.keys(dibujos).length > 0;
  return {
    dibujos,
    hayAlgo,
    sinInternet,
    /** Sin internet y sin ninguna copia de esta zona. */
    sinMapaGuardado: sinInternet && !hayAlgo,
    atribucion: PROVEEDORES_TESELAS[p].atribucion,
  };
}

const CLAVE_PREPARADO = "mapaPreparado";

/** Redondeo a ~1 km: si te mueves menos que eso no hace falta volver a bajar el mapa. */
function huella(puntos: Coordenada[]): string {
  return puntos.map((p) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`).join("|");
}

/** Montado en el diseño raíz: guarda el mapa de tu zona para cuando no haya internet. */
export function PrepararMapaSinInternet() {
  const conexion = useConexion();
  const hecho = useRef(false);
  useEffect(() => {
    if (Platform.OS === "web" || conexion !== "conectado" || hecho.current) return;
    hecho.current = true;
    void (async () => {
      const [perfil, ultima] = await Promise.all([leerPerfilLocal(), leerUltimaUbicacion()]);
      const puntos: Coordenada[] = [];
      if (perfil?.lat !== undefined && perfil?.lng !== undefined) puntos.push({ lat: perfil.lat, lng: perfil.lng });
      if (ultima) puntos.push({ lat: ultima.lat, lng: ultima.lng });
      if (puntos.length === 0) {
        hecho.current = false; // se intenta de nuevo cuando haya ubicación
        return;
      }
      const previo = await leerJson<{ huella: string; fecha: string } | null>(CLAVE_PREPARADO, null);
      const unDia = 24 * 60 * 60 * 1000;
      if (previo && previo.huella === huella(puntos) && Date.now() - new Date(previo.fecha).getTime() < unDia) return;
      const listas = await prepararMapaSinInternet(puntos);
      if (listas > 0) await guardarJson(CLAVE_PREPARADO, { huella: huella(puntos), fecha: new Date().toISOString() });
      else hecho.current = false;
    })();
  }, [conexion]);
  return null;
}
