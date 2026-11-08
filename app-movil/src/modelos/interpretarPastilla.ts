/**
 * Modelo. Interpreta lo que la persona dice en C2 («Dímelo con tu voz: cuál, cuántas y a qué hora»).
 * Funciona sin internet (no usa IA, INC-22). Devuelve solo lo que entendió; el resto se completa a mano.
 * Ejemplos: «De la presión, dos, a las dos de la tarde» · «media pastilla de vitamina a las 8 de la noche».
 */

const NUMEROS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12,
};

export interface PastillaDictada {
  nombre?: string;
  cantidad?: number;
  /** "HH:MM" en 24 h. */
  hora?: string;
}

function valorNumero(palabra: string): number | undefined {
  if (/^\d+$/.test(palabra)) return Number(palabra);
  return NUMEROS[palabra];
}

// Las palabras largas van primero («una» antes que «un») para que la expresión no corte la palabra.
const PALABRA_NUMERO = "(\\d{1,2}|una|uno|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)";

export function interpretarPastilla(dicho: string): PastillaDictada {
  let texto = ` ${dicho.toLowerCase().replace(/[¿?¡!]/g, " ").replace(/\s+/g, " ").trim()} `;
  const resultado: PastillaDictada = {};

  // 1. Hora: «a las dos de la tarde», «a las 8:30 p. m.», «a la una y media», «al mediodía».
  if (/\bmedio ?d[ií]a\b/.test(texto)) {
    resultado.hora = "12:00";
    texto = texto.replace(/\b(a las? \S+ del |a las? |al |del )?medio ?d[ií]a\b/, " ");
  } else {
    const reHora = new RegExp(
      `\\ba las? ${PALABRA_NUMERO}(?::(\\d{2}))?(?: y (media|cuarto))?(?: de la (mañana|manana|tarde|noche)| ?(a\\.? ?m\\.?|p\\.? ?m\\.?))?`,
    );
    const m = texto.match(reHora);
    if (m) {
      let h = valorNumero(m[1]) ?? 0;
      let min = m[2] ? Number(m[2]) : m[3] === "media" ? 30 : m[3] === "cuarto" ? 15 : 0;
      const franja = m[4];
      const ampm = m[5]?.replace(/[\s.]/g, "");
      if ((franja === "tarde" || franja === "noche" || ampm === "pm") && h < 12) h += 12;
      if ((franja === "mañana" || franja === "manana" || ampm === "am") && h === 12) h = 0;
      if (h <= 23 && min <= 59) resultado.hora = `${`${h}`.padStart(2, "0")}:${`${min}`.padStart(2, "0")}`;
      texto = texto.replace(m[0], " ");
    }
  }

  // 2. Cantidad: «media pastilla», «una y media», «dos pastillas», «2».
  const reCantidad = new RegExp(`\\b(?:${PALABRA_NUMERO}(?: y media)?|media)(?= |,)( pastillas?)?`);
  const c = texto.match(reCantidad);
  if (c) {
    const base = c[0].trim().replace(/ pastillas?$/, "");
    if (base === "media") resultado.cantidad = 0.5;
    else {
      const n = valorNumero(base.split(" ")[0]);
      if (n !== undefined && n <= 10) resultado.cantidad = n + (/ y media$/.test(base) ? 0.5 : 0);
    }
    if (resultado.cantidad !== undefined) texto = texto.replace(c[0], " ");
  }

  // 3. Nombre: lo que queda, sin palabras de relleno.
  const nombre = texto
    .replace(/\b(pastillas?|tomo|tomar|toma|recu[eé]rdame|mi|la pastilla|pastilla)\b/g, " ")
    .replace(/^[\s,.:y]+|[\s,.:y]+$/g, "")
    .replace(/\s*,\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // «pastilla de vitamina» → «Vitamina»; «de la presión» se mantiene.
  const sinDe = /^de (?!la |el |los |las )/.test(nombre) ? nombre.slice(3) : nombre;
  if (sinDe.length >= 2) resultado.nombre = sinDe.charAt(0).toUpperCase() + sinDe.slice(1);

  return resultado;
}
