/**
 * Modelo. Convierte un número dicho o escrito a número: «74», «74 años», «setenta y cuatro»,
 * «tengo ochenta y dos años», «cien», «noventa». Sirve para la edad por voz (1 a 120).
 * Regla pura, sin pantalla.
 */
const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const DECENAS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};

export function numeroDicho(texto: string): number | null {
  const t = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const cifra = t.match(/\d{1,3}/);
  if (cifra) return Number(cifra[0]);
  const palabras = t.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  let total = 0;
  let hubo = false;
  for (const p of palabras) {
    if (p === "cien" || p === "ciento") {
      total += 100;
      hubo = true;
    } else if (DECENAS[p] !== undefined) {
      total += DECENAS[p];
      hubo = true;
    } else if (UNIDADES[p] !== undefined) {
      total += UNIDADES[p];
      hubo = true;
    }
  }
  return hubo ? total : null;
}
