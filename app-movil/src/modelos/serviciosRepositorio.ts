/**
 * Modelo. Lee la vista servicios_publicos.
 * Publicar, votar y reportar insertan en la tabla; la base valida con triggers.
 */
import type {
  CrearServicioDTO,
  DarVistoBuenoDTO,
  FilaServicioPublico,
  MotivoReporte,
  ServicioPublico,
} from "./tipos";
import { obtenerSupabase } from "./supabase";
import { redondear3 } from "./geo";

export async function listarServiciosPublicos(zonaId?: string): Promise<ServicioPublico[]> {
  let query = obtenerSupabase().from("servicios_publicos").select("*");
  if (zonaId) {
    query = query.eq("zona_id", zonaId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((fila) => mapearServicio(fila as FilaServicioPublico));
}

export async function crearServicio(dto: CrearServicioDTO): Promise<void> {
  const { error } = await obtenerSupabase().from("servicios").insert({
    nombre_negocio: dto.nombreNegocio ?? null,
    oficio: dto.oficio,
    descripcion: dto.descripcion ?? null,
    precio_desde: dto.precioDesde ?? null,
    hora_apertura: dto.horaApertura ?? null,
    hora_cierre: dto.horaCierre ?? null,
    direccion: dto.direccion ?? null,
    mostrar_direccion: dto.mostrarDireccion,
    contacto: dto.contacto ?? null,
    mostrar_telefono: dto.mostrarTelefono,
    lat: dto.lat === undefined ? null : redondear3(dto.lat),
    lng: dto.lng === undefined ? null : redondear3(dto.lng),
    disponible_emergencia: dto.disponibleEmergencia,
  });
  if (error) throw error;
}

export async function darVistoBueno(dto: DarVistoBuenoDTO): Promise<void> {
  const { error } = await obtenerSupabase().from("vistos_buenos").insert({
    servicio_id: dto.servicioId,
    motivo: dto.motivo,
    comentario: dto.comentario ?? null,
    mostrar_comentario: dto.mostrarComentario,
  });
  if (error) throw error;
}

export async function reportarServicio(servicioId: string, motivo: MotivoReporte): Promise<void> {
  const { error } = await obtenerSupabase().from("reportes").insert({
    servicio_id: servicioId,
    motivo,
  });
  if (error) throw error;
}

export async function actualizarServicio(id: string, dto: Partial<CrearServicioDTO>): Promise<void> {
  const { error } = await obtenerSupabase().from("servicios").update({
    nombre_negocio: dto.nombreNegocio,
    oficio: dto.oficio,
    descripcion: dto.descripcion,
    precio_desde: dto.precioDesde,
    hora_apertura: dto.horaApertura,
    hora_cierre: dto.horaCierre,
    direccion: dto.direccion,
    mostrar_direccion: dto.mostrarDireccion,
    contacto: dto.contacto,
    mostrar_telefono: dto.mostrarTelefono,
    lat: dto.lat === undefined ? undefined : redondear3(dto.lat),
    lng: dto.lng === undefined ? undefined : redondear3(dto.lng),
    disponible_emergencia: dto.disponibleEmergencia,
  }).eq("id", id);
  if (error) throw error;
}

export async function eliminarServicio(id: string): Promise<void> {
  const { error } = await obtenerSupabase().from("servicios").delete().eq("id", id);
  if (error) throw error;
}

// TODO Fase 4: usar reportesRepositorio.

function mapearServicio(fila: FilaServicioPublico): ServicioPublico {
  const comentario = textoOpcional(fila.comentario_destacado);
  const autor = textoOpcional(fila.comentario_autor);
  return {
    id: texto(fila.id),
    nombre: texto(fila.nombre),
    nombreNegocio: textoOpcional(fila.nombre_negocio),
    oficio: texto(fila.oficio),
    descripcion: texto(fila.descripcion),
    precioDesde: numeroOpcional(fila.precio_desde),
    horaApertura: textoOpcional(fila.hora_apertura),
    horaCierre: textoOpcional(fila.hora_cierre),
    abiertoAhora: Boolean(fila.abierto_ahora),
    zona: texto(fila.zona_nombre),
    zonaId: texto(fila.zona_id),
    lat: numeroOpcional(fila.lat),
    lng: numeroOpcional(fila.lng),
    vistoBuenos300m: numero(fila.vistos_buenos_300m),
    vistoBuenoTotal: numero(fila.vistos_buenos_total),
    votosTratoAmable: numero(fila.votos_trato_amable),
    votosBuenPrecio: numero(fila.votos_buen_precio),
    votosConfiable: numero(fila.votos_confiable),
    votosVieneDomicilio: numero(fila.votos_viene_domicilio),
    comentarioDestacado: comentario && autor ? `${comentario} — ${autor}` : comentario,
    comentarioTexto: comentario,
    comentarioAutor: autor,
    disponibleEmergencia: Boolean(fila.disponible_emergencia),
    contacto: textoOpcional(fila.contacto),
    direccion: textoOpcional(fila.direccion),
    esMio: Boolean(fila.es_mio),
  };
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function textoOpcional(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.length > 0 ? valor : undefined;
}

function numero(valor: unknown): number {
  const convertido = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function numeroOpcional(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || valor === "") return undefined;
  const convertido = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(convertido) ? convertido : undefined;
}
