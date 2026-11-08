/**
 * Modelo (local). Copia del mapa en el teléfono para que funcione con y sin internet.
 *
 * - Cada tesela que se ve con internet se guarda en Documentos/teselas/<proveedor>/<z>/<x>/<y>.png
 *   (sobrevive a cerrar la app; Android no la borra como la caché).
 * - Sin internet se usa la copia. Si falta esa tesela exacta, se usa una «madre» de menos zoom ya
 *   guardada (hasta 4 niveles arriba) y se amplía: se ve algo borroso, pero se ven las calles.
 * - `prepararMapaSinInternet` baja, con internet, solo las teselas que mostrarán las pantallas
 *   alrededor de tu casa o tu última ubicación (unas pocas decenas, no una descarga masiva).
 * - Tope de espacio: si pasa de ~1500 teselas (≈ 30 MB) se borran las más antiguas.
 * Sin dependencias de pantalla; en la web no guarda nada.
 */
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { aPixel, PROVEEDORES_TESELAS, TAMANO_TESELA, urlTesela, type Coordenada } from "../mapaOSM";

const CABECERAS = { "User-Agent": "Vecinos/1.0 (app comunitaria, Hackaton UTP 2026)" };
const MAX_TESELAS = 1500;
const NIVELES_MADRE = 4;
const disponible = Platform.OS !== "web";

/** Nombre corto y estable de cada proveedor para la carpeta. */
function carpetaProveedor(indice: number): string {
  return ["esri", "osm", "carto"][indice] ?? `p${indice}`;
}

function raiz(): Directory {
  return new Directory(Paths.document, "teselas");
}

function archivo(proveedor: number, z: number, x: number, y: number): File {
  return new File(raiz(), carpetaProveedor(proveedor), String(z), String(x), `${y}.png`);
}

/** URI local de la tesela si ya está guardada (de cualquier proveedor, empezando por el pedido). */
export function teselaGuardada(proveedor: number, z: number, x: number, y: number): string | null {
  if (!disponible) return null;
  const orden = [proveedor, ...PROVEEDORES_TESELAS.map((_, k) => k).filter((k) => k !== proveedor)];
  for (const p of orden) {
    try {
      const f = archivo(p, z, x, y);
      if (f.exists && (f.size ?? 0) > 0) return f.uri;
    } catch {
      // sigue con el siguiente
    }
  }
  return null;
}

export interface TeselaMadre {
  uri: string;
  /** Cuántos niveles más arriba está (1 = la mitad de zoom). */
  niveles: number;
  /** Posición de nuestra tesela dentro de la madre ampliada (0 … 2^niveles - 1). */
  dx: number;
  dy: number;
}

/** Busca una tesela de menos zoom ya guardada que cubra esta, para ampliarla sin internet. */
export function teselaMadreGuardada(proveedor: number, z: number, x: number, y: number): TeselaMadre | null {
  for (let n = 1; n <= NIVELES_MADRE && z - n >= 0; n += 1) {
    const f = 2 ** n;
    const uri = teselaGuardada(proveedor, z - n, Math.floor(x / f), Math.floor(y / f));
    if (uri) return { uri, niveles: n, dx: x % f, dy: y % f };
  }
  return null;
}

const enCurso = new Map<string, Promise<string | null>>();
let guardadasDesdeLimpieza = 0;

/** Baja y guarda una tesela. Devuelve su URI local, o null si no se pudo (sin internet, 403…). */
export function guardarTesela(proveedor: number, z: number, x: number, y: number): Promise<string | null> {
  if (!disponible) return Promise.resolve(null);
  const clave = `${proveedor}/${z}/${x}/${y}`;
  const previa = enCurso.get(clave);
  if (previa) return previa;
  const trabajo = (async () => {
    try {
      const destino = archivo(proveedor, z, x, y);
      if (destino.exists && (destino.size ?? 0) > 0) return destino.uri;
      destino.parentDirectory.create({ intermediates: true, idempotent: true });
      const plantilla = PROVEEDORES_TESELAS[proveedor]?.plantilla;
      if (!plantilla) return null;
      const bajado = await File.downloadFileAsync(urlTesela(plantilla, z, x, y), destino, { headers: CABECERAS, idempotent: true });
      // Una respuesta vacía o de error (HTML, 403) no sirve como imagen.
      if (!bajado.exists || (bajado.size ?? 0) < 100) {
        try {
          bajado.delete();
        } catch {
          // nada
        }
        return null;
      }
      guardadasDesdeLimpieza += 1;
      if (guardadasDesdeLimpieza >= 100) {
        guardadasDesdeLimpieza = 0;
        limpiarSiHaceFalta();
      }
      return bajado.uri;
    } catch {
      return null;
    } finally {
      enCurso.delete(clave);
    }
  })();
  enCurso.set(clave, trabajo);
  return trabajo;
}

/** Lista todas las teselas guardadas (archivo y fecha). */
function todasLasGuardadas(): { archivo: File; fecha: number }[] {
  const lista: { archivo: File; fecha: number }[] = [];
  const recorrer = (d: Directory) => {
    for (const item of d.list()) {
      if (item instanceof Directory) recorrer(item);
      else lista.push({ archivo: item, fecha: item.modificationTime ?? 0 });
    }
  };
  try {
    const r = raiz();
    if (r.exists) recorrer(r);
  } catch {
    // sin carpeta todavía
  }
  return lista;
}

/** Si hay demasiadas teselas, borra las más antiguas (deja el 80 % del tope). */
export function limpiarSiHaceFalta(): void {
  if (!disponible) return;
  const lista = todasLasGuardadas();
  if (lista.length <= MAX_TESELAS) return;
  lista.sort((a, b) => a.fecha - b.fecha);
  for (const t of lista.slice(0, lista.length - Math.floor(MAX_TESELAS * 0.8))) {
    try {
      t.archivo.delete();
    } catch {
      // sigue
    }
  }
}

/** Teselas (x, y) que cubren un recuadro de `ancho` × `alto` px centrado en el punto, en el zoom z. */
function teselasAlrededor(p: Coordenada, z: number, ancho: number, alto: number): { x: number; y: number }[] {
  const c = aPixel(p, z);
  const max = 2 ** z;
  const lista: { x: number; y: number }[] = [];
  const x0 = Math.floor((c.x - ancho / 2) / TAMANO_TESELA);
  const x1 = Math.floor((c.x + ancho / 2) / TAMANO_TESELA);
  const y0 = Math.floor((c.y - alto / 2) / TAMANO_TESELA);
  const y1 = Math.floor((c.y + alto / 2) / TAMANO_TESELA);
  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      if (y >= 0 && y < max) lista.push({ x: ((x % max) + max) % max, y });
    }
  }
  return lista;
}

/**
 * Con internet: deja guardado el mapa alrededor de estos puntos (casa, última ubicación) en los
 * zooms que usan las pantallas (13 a 17). Son unas 40-60 teselas por punto. Devuelve cuántas quedaron.
 */
export async function prepararMapaSinInternet(puntos: Coordenada[], proveedor = 0): Promise<number> {
  if (!disponible || puntos.length === 0) return 0;
  const pedidos: { z: number; x: number; y: number }[] = [];
  const vistas = new Set<string>();
  for (const p of puntos) {
    for (const z of [13, 14, 15, 16, 17]) {
      // Recuadro un poco más grande que el mapa de la pantalla (≈ 400 × 320 px) para moverse un poco.
      for (const t of teselasAlrededor(p, z, 640, 520)) {
        const clave = `${z}/${t.x}/${t.y}`;
        if (vistas.has(clave)) continue;
        vistas.add(clave);
        pedidos.push({ z, ...t });
      }
    }
  }
  let listas = 0;
  // De a 4 a la vez, para no saturar la red ni el servidor de mapas.
  for (let i = 0; i < pedidos.length; i += 4) {
    const lote = pedidos.slice(i, i + 4);
    const r = await Promise.all(lote.map((t) => guardarTesela(proveedor, t.z, t.x, t.y)));
    listas += r.filter(Boolean).length;
    // Si el primer lote falla entero, no hay internet o el proveedor no responde: se deja para luego.
    if (i === 0 && r.every((u) => !u)) return 0;
  }
  return listas;
}
