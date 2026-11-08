export interface CoordenadaEmergencia {
  lat: number;
  lng: number;
}

export interface FichaMensajeEmergencia {
  texto?: string;
}

export interface DatosMensajeEmergencia {
  nombre?: string | null;
  coord?: CoordenadaEmergencia | null;
  hora: Date;
  ficha?: FichaMensajeEmergencia | null;
  aceptoConsentimiento: boolean;
  /** Enlace de la página «Voy en camino» (enlaces.token), si se pudo crear. */
  enlace?: string | null;
}

function horaLocal(hora: Date): string {
  return `${String(hora.getHours()).padStart(2, "0")}:${String(hora.getMinutes()).padStart(2, "0")}`;
}

export function armarMensajeEmergencia({
  nombre,
  coord,
  hora,
  ficha,
  aceptoConsentimiento,
  enlace,
}: DatosMensajeEmergencia): string {
  const identidad = nombre?.trim() || "un vecino";
  const ubicacion = coord
    ? `Estoy aquí: https://maps.google.com/?q=${coord.lat},${coord.lng}`
    : "No tengo mi ubicación.";
  const fichaTexto =
    aceptoConsentimiento && ficha?.texto?.trim() ? ` Ficha: ${ficha.texto.trim()}` : "";
  const voy = enlace ? ` Si vienes, avísame aquí: ${enlace}` : "";
  return `AYUDA. Soy ${identidad}. Necesito ayuda. ${ubicacion} (a las ${horaLocal(hora)}).${fichaTexto}${voy}`;
}

export function armarMensajeEstoyBien({ nombre }: { nombre?: string | null }): string {
  return `Ya estoy bien. ${nombre?.trim() || "Soy un vecino"}.`;
}

// Ejemplo con ficha: AYUDA. Soy Ana. Necesito ayuda. Estoy aquí: https://maps.google.com/?q=-14.07,-75.732 (a las 09:05). Ficha: vivo sola, me cuesta caminar.
// Ejemplo sin consentimiento: AYUDA. Soy Luis. Necesito ayuda. Estoy aquí: https://maps.google.com/?q=-14.07,-75.732 (a las 09:05).
// Ejemplo con enlace: AYUDA. Soy Ana. … (a las 09:05). Si vienes, avísame aquí: https://kuna-voy.netlify.app/?t=…
// Ejemplo sin ubicación: AYUDA. Soy un vecino. Necesito ayuda. No tengo mi ubicación. (a las 09:05).
