// Pruebas sin red de las 6 herramientas y la validación de entrada y salida.
// Correr: deno test backend/supabase/functions/preguntale/
import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  BOTONES_BASE,
  HERRAMIENTAS,
  noEntiende,
  validarEntrada,
  validarLlamada,
  validarTexto,
} from "./herramientas.ts";

const UUID = "11111111-0000-4000-8000-000000000001";

Deno.test("HERRAMIENTAS define exactamente las 6 funciones permitidas", () => {
  assertEquals(
    HERRAMIENTAS.map((h) => h.nombre).sort(),
    ["buscar_servicio", "como_llegar", "crear_recordatorio", "llamar", "pedir_ayuda", "ver_mi_horario"],
  );
  for (const h of HERRAMIENTAS) {
    assert(h.descripcion.length > 0, h.nombre);
    assertEquals(h.parametros.type, "object", h.nombre);
  }
});

// --- validarLlamada: lo que devuelve la IA ---

Deno.test("una función fuera de la lista es inválida", () => {
  assertEquals(validarLlamada("borrar_todo", {}), null);
  assertEquals(validarLlamada(undefined, {}), null);
});

Deno.test("buscar_servicio acepta un oficio de la lista cerrada", () => {
  assertEquals(validarLlamada("buscar_servicio", { oficio: "gasfitero", abierto_ahora: true }), {
    funcion: "buscar_servicio",
    argumentos: { oficio: "gasfitero", abierto_ahora: true },
    confirmar: false,
  });
});

Deno.test("buscar_servicio rechaza un oficio inventado o un abierto_ahora que no es booleano", () => {
  assertEquals(validarLlamada("buscar_servicio", { oficio: "astronauta" }), null);
  assertEquals(validarLlamada("buscar_servicio", { oficio: "gasfitero", abierto_ahora: "sí" }), null);
});

Deno.test("crear_recordatorio pide confirmar y valida la hora", () => {
  assertEquals(
    validarLlamada("crear_recordatorio", { que: " pastilla de la presión ", hora: "20:00", repetir: "diario" }),
    {
      funcion: "crear_recordatorio",
      argumentos: { que: "pastilla de la presión", hora: "20:00", repetir: "diario" },
      confirmar: true,
    },
  );
  assertEquals(validarLlamada("crear_recordatorio", { que: "pastilla", hora: "8 pm", repetir: "diario" }), null);
  assertEquals(validarLlamada("crear_recordatorio", { que: "pastilla", hora: "24:00", repetir: "diario" }), null);
  assertEquals(validarLlamada("crear_recordatorio", { que: "pastilla", hora: "08:00", repetir: "semanal" }), null);
  assertEquals(validarLlamada("crear_recordatorio", { que: "", hora: "08:00", repetir: "diario" }), null);
});

Deno.test("ver_mi_horario no lleva argumentos y descarta los que sobren", () => {
  assertEquals(validarLlamada("ver_mi_horario", { pastillas: ["x"] }), {
    funcion: "ver_mi_horario",
    argumentos: {},
    confirmar: false,
  });
});

Deno.test("pedir_ayuda pide confirmar, con categoría válida y descripción sin enlaces", () => {
  assertEquals(validarLlamada("pedir_ayuda", { categoria: "compras", descripcion: "Necesito pan." }), {
    funcion: "pedir_ayuda",
    argumentos: { categoria: "compras", descripcion: "Necesito pan." },
    confirmar: true,
  });
  assertEquals(validarLlamada("pedir_ayuda", { categoria: "fiesta" }), null);
  assertEquals(validarLlamada("pedir_ayuda", { categoria: "compras", descripcion: "mira www.x.com" }), null);
  assertEquals(validarLlamada("pedir_ayuda", { categoria: "compras", descripcion: "a".repeat(141) }), null);
});

Deno.test("llamar acepta a_quien o servicio_id, no ninguno ni los dos", () => {
  assertEquals(validarLlamada("llamar", { a_quien: "mi hija" }), {
    funcion: "llamar",
    argumentos: { a_quien: "mi hija" },
    confirmar: false,
  });
  assertEquals(validarLlamada("llamar", { servicio_id: UUID }), {
    funcion: "llamar",
    argumentos: { servicio_id: UUID },
    confirmar: false,
  });
  assertEquals(validarLlamada("llamar", {}), null);
  assertEquals(validarLlamada("llamar", { a_quien: "mi hija", servicio_id: UUID }), null);
  assertEquals(validarLlamada("llamar", { servicio_id: "no-es-uuid" }), null);
});

Deno.test("como_llegar acepta servicio_id o destino", () => {
  assertEquals(validarLlamada("como_llegar", { destino: "Plaza de Armas" }), {
    funcion: "como_llegar",
    argumentos: { destino: "Plaza de Armas" },
    confirmar: false,
  });
  assertEquals(validarLlamada("como_llegar", {}), null);
});

Deno.test("argumentos que no son un objeto son inválidos", () => {
  assertEquals(validarLlamada("pedir_ayuda", null), null);
  assertEquals(validarLlamada("pedir_ayuda", "compras"), null);
});

// --- validarEntrada: lo que manda la app ---

Deno.test("validarEntrada acepta texto y redondea la ubicación a 3 decimales", () => {
  assertEquals(validarEntrada({ texto: "  busca un gasfitero ", lat: -14.06789, lng: -75.72812 }), {
    texto: "busca un gasfitero",
    lat: -14.068,
    lng: -75.728,
  });
});

Deno.test("validarEntrada ignora una ubicación incompleta o fuera de rango", () => {
  assertEquals(validarEntrada({ texto: "hola", lat: -14.068 }), { texto: "hola" });
  assertEquals(validarEntrada({ texto: "hola", lat: 200, lng: 0 }), { texto: "hola" });
});

Deno.test("validarEntrada acepta un zona_id uuid e ignora uno inválido", () => {
  assertEquals(validarEntrada({ texto: "hola", zona_id: UUID }), { texto: "hola", zona_id: UUID });
  assertEquals(validarEntrada({ texto: "hola", zona_id: "cercado" }), { texto: "hola" });
  assertEquals(validarEntrada({ texto: "hola", zona_id: 7 }), { texto: "hola" });
});

Deno.test("validarEntrada rechaza texto vacío, largo o ausente", () => {
  assertEquals(validarEntrada({ texto: "   " }), null);
  assertEquals(validarEntrada({ texto: "a".repeat(301) }), null);
  assertEquals(validarEntrada({}), null);
  assertEquals(validarEntrada(null), null);
});

// --- validarTexto y noEntiende: lo que se lee en voz alta ---

Deno.test("validarTexto recorta a 140 y descarta textos con enlaces", () => {
  assertEquals(validarTexto("  Listo.  "), "Listo.");
  assertEquals(validarTexto("a".repeat(200))?.length, 140);
  assertEquals(validarTexto("Mira https://x.com"), null);
  assertEquals(validarTexto(""), null);
  assertEquals(validarTexto(42), null);
});

Deno.test("noEntiende devuelve funcion null y los 3 botones de siempre", () => {
  const r = noEntiende();
  assertEquals(r.funcion, null);
  assertEquals(r.texto, "No te entendí. ¿Qué necesitas?");
  assertEquals(r.confirmar, false);
  assertEquals(r.botones, BOTONES_BASE);
  assertEquals(BOTONES_BASE.map((b) => b.etiqueta), ["Servicios", "Pastillas", "Ayuda"]);
});
