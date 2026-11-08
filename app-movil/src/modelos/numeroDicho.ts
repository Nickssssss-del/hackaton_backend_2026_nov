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

const CENTENAS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600,
  seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900,
};

/**
 * Convierte lo dictado a una fila de dígitos, en el orden en que se dijo. Sirve para celulares y
 * códigos, que la gente dicta de a pedazos y con palabras:
 *   «939 123 456» → «939123456»
 *   «nueve tres nueve, uno dos tres…» → «939123…»
 *   «novecientos treinta y nueve ciento veintitrés cuatrocientos cincuenta y seis» → «939123456»
 *   «nueve ochenta y siete, seis cinco cuatro» → «987654»
 * Cada número dicho con palabras se escribe completo («treinta y nueve» → «39»).
 */
export function digitosDichos(texto: string): string {
  const t = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const fichas = t.match(/\d+|[a-z]+/g) ?? [];
  let salida = "";
  let valor = 0;
  let hay = false;
  // Qué parte del número ya se dijo: así «nueve tres» son dos números y «treinta y nueve» uno.
  let nivel: "nada" | "centena" | "decena" | "decena_y" | "unidad" = "nada";
  const cerrar = () => {
    if (hay) salida += String(valor);
    valor = 0;
    hay = false;
    nivel = "nada";
  };
  for (const f of fichas) {
    if (/^\d+$/.test(f)) {
      cerrar();
      salida += f;
      continue;
    }
    if (f === "y") {
      if (nivel === "decena") nivel = "decena_y";
      continue;
    }
    if (f === "mil") {
      valor = (hay ? valor : 1) * 1000;
      hay = true;
      cerrar();
      continue;
    }
    const centena = CENTENAS[f];
    if (centena !== undefined) {
      if (nivel !== "nada") cerrar();
      valor = centena;
      hay = true;
      nivel = "centena";
      continue;
    }
    const decena = DECENAS[f];
    if (decena !== undefined) {
      if (nivel !== "nada" && nivel !== "centena") cerrar();
      valor += decena;
      hay = true;
      nivel = "decena";
      continue;
    }
    const unidad = UNIDADES[f];
    if (unidad !== undefined) {
      const cabe = unidad <= 9 ? nivel === "nada" || nivel === "centena" || nivel === "decena" || nivel === "decena_y" : nivel === "nada" || nivel === "centena";
      if (!cabe) cerrar();
      valor += unidad;
      hay = true;
      nivel = "unidad";
    }
    // Otras palabras («mi», «número», «es») no cambian nada.
  }
  cerrar();
  return salida;
}
