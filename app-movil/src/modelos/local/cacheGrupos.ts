import { leerJson, guardarJson } from "../almacen";
import type { CacheGrupos, GrupoApoyoPublico } from "../tipos";

const DEFECTO: CacheGrupos = { grupos: [], fecha: "" };

export function leerCacheGrupos(): Promise<CacheGrupos> {
  return leerJson("cacheGrupos", DEFECTO);
}

export function guardarCacheGrupos(grupos: GrupoApoyoPublico[]): Promise<void> {
  return guardarJson("cacheGrupos", { grupos, fecha: new Date().toISOString() });
}
