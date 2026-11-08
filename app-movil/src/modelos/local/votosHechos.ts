import { leerJson, guardarJson } from "../almacen";

export type VistoHecho = string; // servicioId

export const obtenerVistosHechos = async (): Promise<VistoHecho[]> => {
  return await leerJson<VistoHecho[]>("vistosHechos", []);
};

export const guardarVistosHechos = async (vistos: VistoHecho[]) => {
  await guardarJson("vistosHechos", vistos);
};