/**
 * Modelo. Cálculos del mapa de OpenStreetMap (proyección Web Mercator, teselas de 256 px).
 * Sin dependencias: lo usa la vista MapaOSM para colocar teselas y puntos.
 */

export const TAMANO_TESELA = 256;
export const URL_TESELAS = "https://tile.openstreetmap.org";
/**
 * Proveedores de teselas, en orden. Las de tile.openstreetmap.org suelen bloquear apps (403), por
 * eso primero va CARTO (datos de OpenStreetMap, uso libre con atribución) y OSM queda de respaldo.
 */
export const PROVEEDORES_TESELAS: readonly { base: string; atribucion: string }[] = [
  { base: "https://basemaps.cartocdn.com/rastertiles/voyager", atribucion: "© OpenStreetMap · © CARTO" },
  { base: URL_TESELAS, atribucion: "© OpenStreetMap" },
];

export interface Coordenada {
  lat: number;
  lng: number;
}

/** Coordenada → píxel global en el zoom `z`. */
export function aPixel({ lat, lng }: Coordenada, z: number): { x: number; y: number } {
  const total = TAMANO_TESELA * 2 ** z;
  const x = ((lng + 180) / 360) * total;
  const sen = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sen) / (1 - sen)) / (4 * Math.PI)) * total;
  return { x, y };
}

/** Metros por píxel en esa latitud y zoom. */
export function metrosPorPixel(lat: number, z: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

/**
 * Zoom más cercano (máx. 18) en el que caben todos los puntos y el radio pedido,
 * dejando un margen, en un recuadro de `ancho` × `alto` px.
 */
export function zoomParaVer(puntos: Coordenada[], radioM: number, ancho: number, alto: number): number {
  for (let z = 18; z >= 3; z -= 1) {
    const px = puntos.map((p) => aPixel(p, z));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    const radioPx = radioM / metrosPorPixel(puntos[0]?.lat ?? 0, z);
    const anchoNecesario = Math.max(...xs) - Math.min(...xs) + radioPx * 2;
    const altoNecesario = Math.max(...ys) - Math.min(...ys) + radioPx * 2;
    if (anchoNecesario <= ancho * 0.75 && altoNecesario <= alto * 0.75) return z;
  }
  return 3;
}

export interface Tesela {
  clave: string;
  url: string;
  izquierda: number;
  arriba: number;
}

/** Teselas que cubren un recuadro centrado en `centro` (píxel global), con su posición en el recuadro. */
export function teselasVisibles(
  centro: { x: number; y: number },
  z: number,
  ancho: number,
  alto: number,
  base: string = PROVEEDORES_TESELAS[0].base,
): Tesela[] {
  const izq = centro.x - ancho / 2;
  const arr = centro.y - alto / 2;
  const max = 2 ** z;
  const lista: Tesela[] = [];
  for (let tx = Math.floor(izq / TAMANO_TESELA); tx <= Math.floor((izq + ancho) / TAMANO_TESELA); tx += 1) {
    for (let ty = Math.floor(arr / TAMANO_TESELA); ty <= Math.floor((arr + alto) / TAMANO_TESELA); ty += 1) {
      if (ty < 0 || ty >= max) continue;
      const x = ((tx % max) + max) % max;
      lista.push({
        clave: `${z}/${x}/${ty}`,
        url: `${base}/${z}/${x}/${ty}.png`,
        izquierda: tx * TAMANO_TESELA - izq,
        arriba: ty * TAMANO_TESELA - arr,
      });
    }
  }
  return lista;
}
