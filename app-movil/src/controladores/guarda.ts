import { asegurarSesionAnonima } from "../modelos/supabase";
import { guardarPerfilNube } from "../modelos/perfilRepositorio";
import type { PerfilLocal } from "../modelos/tipos";
import { perfilCompleto } from "./usePerfil";
import { mensajeDeError } from "./errores";

type OpcionesEscritura = {
  perfil: PerfilLocal | null;
  internetReal: boolean;
  irAlRegistro: () => void;
  avisar: (mensaje: string) => void;
  ejecutar: () => Promise<void>;
};

export async function exigirEscritura(opciones: OpcionesEscritura): Promise<boolean> {
  const perfil = opciones.perfil;
  if (!perfil || !perfilCompleto(perfil)) {
    opciones.irAlRegistro();
    opciones.avisar("Completa tus datos para continuar");
    return false;
  }
  if (!opciones.internetReal) {
    opciones.avisar("Necesitas internet para continuar");
    return false;
  }
  try {
    await asegurarSesionAnonima();
    await guardarPerfilNube(perfil);
    await opciones.ejecutar();
    return true;
  } catch (causa) {
    opciones.avisar(mensajeDeError(causa, "general"));
    return false;
  }
}
