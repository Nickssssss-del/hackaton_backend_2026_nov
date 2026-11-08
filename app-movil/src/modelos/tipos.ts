/**
 * Modelo. Contratos de la app, en camelCase.
 * Las lecturas públicas salen de las vistas servicios_publicos y pedidos_cercanos.
 * La app no modela lecturas de tablas privadas ni perfiles ajenos.
 */

/** Fila cruda de la vista servicios_publicos. */
export interface FilaServicioPublico {
  id: string;
  nombre: string | null;
  nombre_negocio: string | null;
  oficio: Oficio;
  descripcion: string | null;
  precio_desde: number | string | null;
  hora_apertura: string | null;
  hora_cierre: string | null;
  abierto_ahora: boolean | null;
  zona_id: string;
  zona_nombre: string;
  lat: number | string | null;
  lng: number | string | null;
  direccion: string | null;
  contacto: string | null;
  disponible_emergencia: boolean;
  vistos_buenos_total: number | string;
  vistos_buenos_300m: number | string;
  votos_trato_amable: number | string;
  votos_buen_precio: number | string;
  votos_confiable: number | string;
  votos_viene_domicilio: number | string;
  comentario_destacado: string | null;
  comentario_autor: string | null;
  comentario_fecha: string | null;
  es_mio: boolean;
  creado_en: string;
}

/** Servicio tal como lo muestra la vista. */
export interface ServicioPublico {
  id: string;
  /** Nombre del negocio o del autor. */
  nombre: string;
  /** Nombre del negocio (si el autor lo proporcionó). */
  nombreNegocio?: string;
  oficio: string;
  descripcion: string;
  precioDesde?: number;
  horaApertura?: string;
  horaCierre?: string;
  abiertoAhora: boolean;
  zona: string;
  zonaId: string;
  lat?: number;
  lng?: number;
  vistoBuenos300m: number;
  vistoBuenoTotal: number;
  votosTratoAmable: number;
  votosBuenPrecio: number;
  votosConfiable: number;
  votosVieneDomicilio: number;
  comentarioDestacado?: string;
  /** Texto del comentario destacado sin el autor (E3 los muestra por separado). */
  comentarioTexto?: string;
  comentarioAutor?: string;
  esMio: boolean;
  /** Disponible en emergencias. */
  disponibleEmergencia?: boolean;
  /** Presente solo si el autor permitió mostrar el contacto. */
  contacto?: string;
  /** Presente solo si el autor permitió mostrar la dirección. */
  direccion?: string;
}

/** Fila cruda de la vista pedidos_cercanos. */
export interface FilaPedidoCercano {
  id: string;
  nombre_corto: string | null;
  categoria: CategoriaPedido;
  descripcion: string | null;
  zona_id: string;
  creado_en: string;
  expira_en: string;
  minutos_antiguedad: number | string;
  es_mio: boolean;
  ya_ofreci: boolean;
}

export type CategoriaPedido = "arreglos" | "compras" | "transporte" | "salud";

/** Pedido tal como lo muestra la vista. */
export interface PedidoCercano {
  id: string;
  nombreCorto: string;
  categoria: CategoriaPedido;
  descripcion: string;
  antiguedad: string;
  esMio: boolean;
  yaOfreci: boolean;
}

/** Datos para publicar un servicio. La descripción admite 140 caracteres y no lleva enlaces. */
export interface CrearServicioDTO {
  nombreNegocio?: string;
  oficio: Oficio;
  descripcion?: string;
  precioDesde?: number;
  horaApertura?: string;
  horaCierre?: string;
  direccion?: string;
  mostrarDireccion: boolean;
  contacto?: string;
  mostrarTelefono: boolean;
  lat?: number;
  lng?: number;
  disponibleEmergencia: boolean;
}

/** Datos para publicar un pedido. La descripción admite 140 caracteres y no lleva enlaces. */
export interface CrearPedidoDTO {
  categoria: CategoriaPedido;
  descripcion: string;
  zonaId?: string;
}

export const OFICIOS = [
  "cafeteria",
  "bodega",
  "panaderia",
  "restaurante",
  "mercado",
  "farmacia",
  "gasfitero",
  "electricista",
  "carpintero",
  "albanil",
  "pintor",
  "cerrajero",
  "costurera",
  "zapatero",
  "peluqueria",
  "lavanderia",
  "mecanico",
  "tecnico_celulares",
  "jardinero",
  "mototaxi",
  "cuidado_personas",
  "clases_particulares",
  "otro",
] as const;

export type Oficio = (typeof OFICIOS)[number];

export type MotivoReporte = "estafa" | "datos_falsos" | "ofensivo" | "no_existe" | "otro";

export interface ZonaPublica {
  id: string;
  nombre: string;
  distrito: string;
  latCentro?: number;
  lngCentro?: number;
  radioM?: number;
}

export interface GrupoApoyoPublico {
  id: string;
  nombre: string;
  tipo: TipoGrupoApoyo;
  contacto: string | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  zonaId: string | null;
  verificada: boolean;
}

export type TipoGrupoApoyo =
  | "brigada"
  | "bomberos"
  | "comisaria"
  | "salud"
  | "municipalidad"
  | "punto_seguro"
  | "otro";

export interface PerfilNube {
  id: string;
  nombre: string | null;
  celular: string | null;
  celular_verificado: boolean;
  cuenta_asegurada_en: string | null;
  zona_id: string | null;
  lat: number | null;
  lng: number | null;
  creado_en: string;
}

export type MotivoVistoBueno =
  | "trato_amable"
  | "buen_precio"
  | "confiable"
  | "viene_domicilio";

/** Datos para registrar un visto bueno. El comentario admite 140 caracteres y no lleva enlaces. */
export interface DarVistoBuenoDTO {
  servicioId: string;
  motivo: MotivoVistoBueno;
  comentario?: string;
  mostrarComentario: boolean;
}

/**
 * Copia local del vecino. La cuenta puede seguir anónima:
 * celular y zona se completan solo si la persona quiere.
 */
export interface PerfilLocal {
  nombre?: string;
  zonaId?: string;
  celular?: string;
  lat?: number;
  lng?: number;
  /** Registro Mockup v4 (A4). Solo en el celular, nunca se envía a la nube. */
  edad?: number;
  genero?: Genero;
  /** Avatar elegido a mano en Mis datos; sin valor se elige por edad y género. Solo en el celular. */
  avatar?: "senora" | "senor" | "jovenMujer" | "jovenHombre";
  /** Registro Mockup v4 (A3.1). Solo en el celular. */
  direccion?: DireccionLocal;
}

export type Genero = "mujer" | "hombre" | "no_decir";

export interface DireccionLocal {
  calle: string;
  numero: string;
  referencia: string;
}

export interface ContactoEmergencia {
  nombre: string;
  telefono: string;
}

export interface ContactoLocal {
  nombre: string;
  telefono: string;
  relacion: string;
  orden: number;
}

/** Ficha guardada solo en el teléfono. */
export interface FichaEmergencia {
  contactos: ContactoEmergencia[];
  mensaje: string;
  consentimiento?: Consentimiento;
}

export interface ContactoConfianza extends ContactoEmergencia {}

export interface Consentimiento {
  aceptado: boolean;
  fecha: string;
}

export interface UltimaUbicacion {
  lat: number;
  lng: number;
  fecha: string;
}

export interface CacheGrupos {
  grupos: GrupoApoyoPublico[];
  fecha: string;
}
