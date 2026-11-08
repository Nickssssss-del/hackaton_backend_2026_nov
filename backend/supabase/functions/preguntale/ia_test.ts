// Pruebas sin red de llamarIA(): fetch es un doble que responde como Groq.
// Correr: deno test backend/supabase/functions/preguntale/
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { llamarIA, llamarIAConRespaldo, URL_POR_DEFECTO } from "./ia.ts";

function respuestaGroq(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });
}

function conLlamada(nombre: string, argumentos: string) {
  return {
    choices: [{ message: { role: "assistant", tool_calls: [{ id: "c1", type: "function", function: { name: nombre, arguments: argumentos } }] } }],
  };
}

Deno.test("llamarIA envía a Groq el texto, las 6 herramientas y tool_choice auto", async () => {
  let url = "";
  let init: RequestInit = {};
  const enviar = (u: string | URL | Request, i?: RequestInit) => {
    url = String(u);
    init = i ?? {};
    return Promise.resolve(respuestaGroq({ choices: [{ message: { content: "Hola." } }] }));
  };

  await llamarIA("hola", { apiKey: "clave-de-prueba", modelo: "modelo-x", url: URL_POR_DEFECTO, enviar });

  assertEquals(url, "https://api.groq.com/openai/v1/chat/completions");
  assertEquals(init.method, "POST");
  assertEquals((init.headers as Record<string, string>).Authorization, "Bearer clave-de-prueba");
  assert(init.signal instanceof AbortSignal);
  const cuerpo = JSON.parse(init.body as string);
  assertEquals(cuerpo.model, "modelo-x");
  assertEquals(cuerpo.tool_choice, "auto");
  assertEquals(cuerpo.tools.length, 6);
  assertEquals(cuerpo.tools[0].type, "function");
  assertEquals(Object.keys(cuerpo.tools[0].function).sort(), ["description", "name", "parameters"]);
  assert(cuerpo.messages[0].content.includes("la app Kuna"));
  assertEquals(cuerpo.messages[1], { role: "user", content: "hola" });
});

Deno.test("los esquemas enviados a Groq no llevan pattern ni format", async () => {
  let body = "";
  const enviar = (_u: string | URL | Request, i?: RequestInit) => {
    body = i?.body as string;
    return Promise.resolve(respuestaGroq({ choices: [{ message: { content: "Hola." } }] }));
  };

  await llamarIA("hola", { apiKey: "k", modelo: "m", url: URL_POR_DEFECTO, enviar });

  const tools = JSON.stringify(JSON.parse(body).tools);
  assert(!tools.includes('"pattern":'), "el body no debe tener pattern");
  assert(!tools.includes('"format":'), "el body no debe tener format");
  // El resto del esquema se conserva: la hora sigue siendo un string obligatorio.
  const recordatorio = JSON.parse(body).tools.find((t: { function: { name: string } }) =>
    t.function.name === "crear_recordatorio"
  );
  assertEquals(recordatorio.function.parameters.properties.hora.type, "string");
  assertEquals(recordatorio.function.parameters.required, ["que", "hora", "repetir"]);
});

Deno.test("la URL por defecto es la de Groq", () => {
  assertEquals(URL_POR_DEFECTO, "https://api.groq.com/openai/v1/chat/completions");
});

Deno.test("llamarIA envía a la URL configurada (por ejemplo, Gemini compatible con OpenAI)", async () => {
  const gemini = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  let url = "";
  const enviar = (u: string | URL | Request) => {
    url = String(u);
    return Promise.resolve(respuestaGroq({ choices: [{ message: { content: "Hola." } }] }));
  };
  await llamarIA("hola", { apiKey: "k", modelo: "m", url: gemini, enviar });
  assertEquals(url, gemini);
});

Deno.test("llamarIA devuelve la primera tool_call con sus argumentos ya leídos", async () => {
  const enviar = () => Promise.resolve(respuestaGroq(conLlamada("buscar_servicio", '{"oficio":"gasfitero"}')));
  const llamada = await llamarIA("busca gasfitero", { apiKey: "k", modelo: "m", url: URL_POR_DEFECTO, enviar });
  assertEquals(llamada, { nombre: "buscar_servicio", argumentos: { oficio: "gasfitero" } });
});

Deno.test("llamarIA devuelve null si arguments no es JSON válido", async () => {
  const enviar = () => Promise.resolve(respuestaGroq(conLlamada("buscar_servicio", "{oficio: gasfitero")));
  assertEquals(await llamarIA("x", { apiKey: "k", modelo: "m", url: URL_POR_DEFECTO, enviar }), null);
});

Deno.test("llamarIA devuelve null si la IA no pidió ninguna función", async () => {
  const enviar = () => Promise.resolve(respuestaGroq({ choices: [{ message: { content: "No sé." } }] }));
  assertEquals(await llamarIA("x", { apiKey: "k", modelo: "m", url: URL_POR_DEFECTO, enviar }), null);
});

Deno.test("llamarIA lanza error si Groq responde con error HTTP", async () => {
  const enviar = () => Promise.resolve(respuestaGroq({ error: { message: "límite" } }, 429));
  await assertRejects(() => llamarIA("x", { apiKey: "k", modelo: "m", url: URL_POR_DEFECTO, enviar }));
});

Deno.test("llamarIA lanza error si falta la clave", async () => {
  const enviar = () => Promise.resolve(respuestaGroq({}));
  await assertRejects(() => llamarIA("x", { apiKey: "", modelo: "m", url: URL_POR_DEFECTO, enviar }));
});

// --- llamarIAConRespaldo: la principal y el respaldo responden por URL distinta ---

const PRINCIPAL = { apiKey: "clave-principal", modelo: "modelo-principal", url: "https://principal.test/v1/chat/completions" };
const RESPALDO = { apiKey: "clave-respaldo", modelo: "modelo-respaldo", url: "https://respaldo.test/v1/chat/completions" };

/** fetch falso: cada URL responde con lo que se le indique y se registra cada llamada. */
function fetchFalso(respuestas: Record<string, () => Response | Promise<Response>>) {
  const llamadas: { url: string; init: RequestInit }[] = [];
  const enviar = (u: string | URL | Request, i?: RequestInit) => {
    const url = String(u);
    llamadas.push({ url, init: i ?? {} });
    return Promise.resolve(respuestas[url]());
  };
  return { enviar, llamadas };
}

Deno.test("con respaldo: si la principal responde bien, no se llama al respaldo", async () => {
  const avisos: string[] = [];
  const { enviar, llamadas } = fetchFalso({
    [PRINCIPAL.url]: () => respuestaGroq(conLlamada("ver_mi_horario", "{}")),
    [RESPALDO.url]: () => respuestaGroq(conLlamada("pedir_ayuda", '{"categoria":"salud"}')),
  });
  const llamada = await llamarIAConRespaldo("mi horario", {
    principal: PRINCIPAL, respaldo: RESPALDO, enviar, avisar: (m) => avisos.push(m),
  });
  assertEquals(llamada, { nombre: "ver_mi_horario", argumentos: {} });
  assertEquals(llamadas.map((l) => l.url), [PRINCIPAL.url]);
  assertEquals(avisos, []);
});

Deno.test("con respaldo: si la principal da 429, responde el respaldo con su clave y su modelo", async () => {
  const avisos: string[] = [];
  const { enviar, llamadas } = fetchFalso({
    [PRINCIPAL.url]: () => respuestaGroq({ error: { message: "límite" } }, 429),
    [RESPALDO.url]: () => respuestaGroq(conLlamada("buscar_servicio", '{"oficio":"gasfitero"}')),
  });
  const llamada = await llamarIAConRespaldo("busca un gasfitero en Calle Lima 245", {
    principal: PRINCIPAL, respaldo: RESPALDO, enviar, avisar: (m) => avisos.push(m),
  });

  assertEquals(llamada, { nombre: "buscar_servicio", argumentos: { oficio: "gasfitero" } });
  assertEquals(llamadas.map((l) => l.url), [PRINCIPAL.url, RESPALDO.url]);
  const alRespaldo = llamadas[1].init;
  assertEquals((alRespaldo.headers as Record<string, string>).Authorization, "Bearer clave-respaldo");
  assertEquals(JSON.parse(alRespaldo.body as string).model, "modelo-respaldo");
  assertEquals(avisos, ["IA principal falló: IA_HTTP_429, usando respaldo"]);
});

Deno.test("con respaldo: el aviso no lleva el texto, la ubicación ni las claves", async () => {
  const avisos: string[] = [];
  const { enviar } = fetchFalso({
    [PRINCIPAL.url]: () => Promise.reject(new TypeError("error sending request for url (https://principal.test/…)")),
    [RESPALDO.url]: () => respuestaGroq(conLlamada("ver_mi_horario", "{}")),
  });
  await llamarIAConRespaldo("vivo en Calle Lima 245, -14.068", {
    principal: PRINCIPAL, respaldo: RESPALDO, enviar, avisar: (m) => avisos.push(m),
  });
  assertEquals(avisos, ["IA principal falló: TypeError, usando respaldo"]);
  const aviso = avisos.join(" ");
  for (const secreto of ["Calle Lima", "-14.068", "clave-principal", "clave-respaldo", "principal.test"]) {
    assert(!aviso.includes(secreto), `el aviso no debe incluir ${secreto}`);
  }
});

Deno.test("con respaldo: si la principal no elige herramienta (null), no se usa el respaldo", async () => {
  const { enviar, llamadas } = fetchFalso({
    [PRINCIPAL.url]: () => respuestaGroq({ choices: [{ message: { content: "No sé." } }] }),
    [RESPALDO.url]: () => respuestaGroq(conLlamada("ver_mi_horario", "{}")),
  });
  const llamada = await llamarIAConRespaldo("asdfgh", { principal: PRINCIPAL, respaldo: RESPALDO, enviar, avisar: () => {} });
  assertEquals(llamada, null);
  assertEquals(llamadas.map((l) => l.url), [PRINCIPAL.url]);
});

Deno.test("sin respaldo configurado: el error de la principal se lanza como hoy", async () => {
  const avisos: string[] = [];
  const { enviar, llamadas } = fetchFalso({
    [PRINCIPAL.url]: () => respuestaGroq({ error: {} }, 503),
  });
  await assertRejects(
    () => llamarIAConRespaldo("hola", { principal: PRINCIPAL, respaldo: null, enviar, avisar: (m) => avisos.push(m) }),
    Error,
    "IA_HTTP_503",
  );
  assertEquals(llamadas.length, 1);
  assertEquals(avisos, []);
});

Deno.test("con respaldo: si las dos fallan, se lanza el error del respaldo", async () => {
  const { enviar, llamadas } = fetchFalso({
    [PRINCIPAL.url]: () => respuestaGroq({ error: {} }, 500),
    [RESPALDO.url]: () => respuestaGroq({ error: {} }, 502),
  });
  await assertRejects(
    () => llamarIAConRespaldo("hola", { principal: PRINCIPAL, respaldo: RESPALDO, enviar, avisar: () => {} }),
    Error,
    "IA_HTTP_502",
  );
  assertEquals(llamadas.length, 2);
});
