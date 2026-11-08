// Pruebas sin red del handler: la IA y la búsqueda son dobles inyectados.
// Correr: deno test backend/supabase/functions/preguntale/
import { assert, assertEquals } from "jsr:@std/assert@1";
import { crearHandler, type Dependencias, type ServicioEncontrado } from "./handler.ts";

const UUID = "11111111-0000-4000-8000-000000000001";

function pedido(cuerpo: unknown, init: RequestInit = {}) {
  return new Request("http://localhost/preguntale", {
    method: "POST",
    headers: { Authorization: "Bearer jwt-de-prueba", "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    ...init,
  });
}

function deps(parcial: Partial<Dependencias> = {}): Dependencias {
  return {
    llamarIA: () => Promise.resolve(null),
    buscarServicios: () => Promise.resolve([]),
    ...parcial,
  };
}

Deno.test("un método que no es POST responde 405", async () => {
  const r = await crearHandler(deps())(new Request("http://localhost/preguntale"));
  assertEquals(r.status, 405);
  assertEquals((await r.json()).error, "METODO_INVALIDO");
});

Deno.test("sin Authorization responde 401", async () => {
  const r = await crearHandler(deps())(
    new Request("http://localhost/preguntale", { method: "POST", body: JSON.stringify({ texto: "hola" }) }),
  );
  assertEquals(r.status, 401);
  assertEquals((await r.json()).error, "SIN_SESION");
});

Deno.test("texto inválido o JSON roto responde 400", async () => {
  const vacio = await crearHandler(deps())(pedido({ texto: "  " }));
  assertEquals(vacio.status, 400);
  assertEquals((await vacio.json()).error, "TEXTO_INVALIDO");

  const roto = await crearHandler(deps())(pedido(null, { body: "{no es json" }));
  assertEquals(roto.status, 400);
});

Deno.test("a la IA solo le llega el texto, nunca la ubicación ni la zona", async () => {
  let recibido: unknown[] = [];
  const handler = crearHandler(deps({
    llamarIA: (...args) => {
      recibido = args;
      return Promise.resolve(null);
    },
  }));
  await handler(pedido({ texto: "hola", lat: -14.068, lng: -75.728, zona_id: UUID }));
  assertEquals(recibido, ["hola"]);
});

Deno.test("si la IA no elige función, responde no entiende con los 3 botones", async () => {
  const r = await crearHandler(deps())(pedido({ texto: "asdfgh" }));
  assertEquals(r.status, 200);
  const cuerpo = await r.json();
  assertEquals(cuerpo.funcion, null);
  assertEquals(cuerpo.texto, "No te entendí. ¿Qué necesitas?");
  assertEquals(cuerpo.botones.map((b: { etiqueta: string }) => b.etiqueta), ["Servicios", "Pastillas", "Ayuda"]);
});

Deno.test("si la IA pide una función fuera de la lista, responde no entiende", async () => {
  const r = await crearHandler(deps({
    llamarIA: () => Promise.resolve({ nombre: "borrar_todo", argumentos: {} }),
  }))(pedido({ texto: "borra todo" }));
  assertEquals((await r.json()).funcion, null);
});

Deno.test("si la IA falla, responde 200 con el aviso de no pude responder", async () => {
  const r = await crearHandler(deps({
    llamarIA: () => Promise.reject(new Error("timeout")),
  }))(pedido({ texto: "hola" }));
  assertEquals(r.status, 200);
  const cuerpo = await r.json();
  assertEquals(cuerpo.funcion, null);
  assertEquals(cuerpo.texto, "No pude responder ahora. Elige una opción.");
});

Deno.test("crear_recordatorio devuelve confirmar y un texto que pregunta ¿Lo guardo?", async () => {
  const r = await crearHandler(deps({
    llamarIA: () =>
      Promise.resolve({
        nombre: "crear_recordatorio",
        argumentos: { que: "pastilla de la presión", hora: "20:00", repetir: "diario" },
      }),
  }))(pedido({ texto: "recuérdame la pastilla a las 8 de la noche" }));
  const cuerpo = await r.json();
  assertEquals(cuerpo.funcion, "crear_recordatorio");
  assertEquals(cuerpo.argumentos, { que: "pastilla de la presión", hora: "20:00", repetir: "diario" });
  assertEquals(cuerpo.confirmar, true);
  assert(cuerpo.texto.startsWith("¿Lo guardo?"));
  assert(cuerpo.texto.length <= 140);
});

Deno.test("buscar_servicio usa la búsqueda con la ubicación y devuelve hasta 3 servicios", async () => {
  const encontrados: ServicioEncontrado[] = [1, 2, 3, 4].map((n) => ({
    id: `${UUID.slice(0, -1)}${n}`,
    nombre: `Gasfitero ${n}`,
    oficio: "gasfitero",
    abierto_ahora: true,
    vistos_buenos_total: n,
    contacto: n === 1 ? "956000111" : null,
    lat: -14.068,
    lng: -75.728,
  }));
  let filtro: unknown[] = [];
  const r = await crearHandler(deps({
    llamarIA: () => Promise.resolve({ nombre: "buscar_servicio", argumentos: { oficio: "gasfitero", abierto_ahora: true } }),
    buscarServicios: (...args) => {
      filtro = args;
      return Promise.resolve(encontrados);
    },
  }))(pedido({ texto: "busca un gasfitero abierto", lat: -14.06789, lng: -75.72812, zona_id: UUID }));
  const cuerpo = await r.json();

  // Con ubicación se ordena por cercanía y no se filtra por zona.
  assertEquals(filtro[1], { oficio: "gasfitero", abierto_ahora: true });
  assertEquals(filtro[2], { lat: -14.068, lng: -75.728 });
  assertEquals(cuerpo.funcion, "buscar_servicio");
  assertEquals(cuerpo.servicios.length, 3);
  assertEquals(cuerpo.texto, "Encontré 3 opciones de gasfitero.");
  assertEquals(cuerpo.botones[0], { etiqueta: "Llamar a Gasfitero 1", funcion: "llamar", argumentos: { servicio_id: encontrados[0].id } });
});

Deno.test("buscar_servicio sin ubicación filtra por zona_id", async () => {
  let filtro: unknown[] = [];
  const r = await crearHandler(deps({
    llamarIA: () => Promise.resolve({ nombre: "buscar_servicio", argumentos: { oficio: "tecnico_celulares" } }),
    buscarServicios: (...args) => {
      filtro = args;
      return Promise.resolve([]);
    },
  }))(pedido({ texto: "arreglan celulares?", zona_id: UUID }));
  const cuerpo = await r.json();
  assertEquals(filtro[1], { oficio: "tecnico_celulares", zona_id: UUID });
  assertEquals(filtro[2], undefined);
  assertEquals(cuerpo.servicios, []);
  assertEquals(cuerpo.texto, "No encontré tecnico celulares en tu barrio.");
});

Deno.test("buscar_servicio sin resultados devuelve los 3 botones de siempre", async () => {
  const r = await crearHandler(deps({
    llamarIA: () => Promise.resolve({ nombre: "buscar_servicio", argumentos: { oficio: "cerrajero" } }),
    buscarServicios: () => Promise.resolve([]),
  }))(pedido({ texto: "necesito un cerrajero", zona_id: UUID }));
  const cuerpo = await r.json();
  assertEquals(cuerpo.funcion, "buscar_servicio");
  assertEquals(cuerpo.servicios, []);
  assertEquals(cuerpo.botones.map((b: { etiqueta: string }) => b.etiqueta), ["Servicios", "Pastillas", "Ayuda"]);
});

Deno.test("buscar_servicio sin ubicación ni zona pregunta el barrio y no busca", async () => {
  let busco = false;
  const r = await crearHandler(deps({
    llamarIA: () => Promise.resolve({ nombre: "buscar_servicio", argumentos: { oficio: "gasfitero" } }),
    buscarServicios: () => {
      busco = true;
      return Promise.resolve([]);
    },
  }))(pedido({ texto: "busca un gasfitero" }));
  const cuerpo = await r.json();
  assertEquals(busco, false);
  assertEquals(cuerpo.funcion, null);
  assertEquals(cuerpo.texto, "¿En qué barrio estás?");
  assertEquals(cuerpo.botones.map((b: { etiqueta: string }) => b.etiqueta), ["Servicios", "Pastillas", "Ayuda"]);
});

Deno.test("si la búsqueda falla, responde no pude responder", async () => {
  const r = await crearHandler(deps({
    llamarIA: () => Promise.resolve({ nombre: "buscar_servicio", argumentos: { oficio: "gasfitero" } }),
    buscarServicios: () => Promise.reject(new Error("rls")),
  }))(pedido({ texto: "gasfitero", zona_id: UUID }));
  const cuerpo = await r.json();
  assertEquals(cuerpo.funcion, null);
  assertEquals(cuerpo.texto, "No pude responder ahora. Elige una opción.");
});

Deno.test("pedir_ayuda devuelve confirmar", async () => {
  const r = await crearHandler(deps({
    llamarIA: () => Promise.resolve({ nombre: "pedir_ayuda", argumentos: { categoria: "compras", descripcion: "Necesito pan." } }),
  }))(pedido({ texto: "necesito que alguien me compre pan" }));
  const cuerpo = await r.json();
  assertEquals(cuerpo.funcion, "pedir_ayuda");
  assertEquals(cuerpo.confirmar, true);
  assertEquals(cuerpo.texto, "¿Lo guardo? Pedir ayuda: Necesito pan.");
});

Deno.test("si la IA falla, el log muestra solo el código seguro, sin el texto ni la URL", async () => {
  const registros: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => registros.push(args);
  try {
    await crearHandler(deps({ llamarIA: () => Promise.reject(new Error("IA_HTTP_400")) }))(
      pedido({ texto: "busca un gasfitero en Calle Lima 245" }),
    );
    await crearHandler(deps({
      llamarIA: () => Promise.reject(new TypeError("error sending request for url (https://api.groq.com/x)")),
    }))(pedido({ texto: "busca un gasfitero en Calle Lima 245" }));
  } finally {
    console.error = original;
  }
  assertEquals(registros, [
    ["preguntale: IA_NO_DISPONIBLE", "IA_HTTP_400"],
    ["preguntale: IA_NO_DISPONIBLE", "TypeError"],
  ]);
  const todo = JSON.stringify(registros);
  assert(!todo.includes("Calle Lima") && !todo.includes("api.groq.com"), todo);
});
