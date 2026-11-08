/**
 * Descarga un CSV con punto y coma para Excel en español.
 * UTF-8 con BOM, para que las tildes y la ñ se lean bien.
 */

function fechaLima(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

function celda(valor: string | number): string {
  let texto = String(valor);
  if (typeof valor === "string" && /^[=+\-@]/.test(texto)) texto = `'${texto}`;
  if (/[";\r\n]/.test(texto)) texto = `"${texto.replaceAll('"', '""')}"`;
  return texto;
}

/** nombreArchivo es la base, por ejemplo "kuna-resumen". La fecha de Lima se agrega aquí. */
export function descargarCsv(nombreArchivo: string, columnas: string[], filas: (string | number)[][]): void {
  const base = nombreArchivo.replace(/\.csv$/i, "");
  const lineas = [columnas, ...filas].map((fila) => fila.map(celda).join(";"));
  const csv = `\uFEFF${lineas.join("\r\n")}\r\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${base}-${fechaLima()}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
