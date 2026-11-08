// Pruebas sin red de llamarIA(): fetch es un doble que responde como Groq.
// Correr: deno test backend/supabase/functions/preguntale/
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { llamarIA } from "./ia.ts";

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

  await llamarIA("hola", { apiKey: "clave-de-prueba", modelo: "modelo-x", enviar });

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

  await llamarIA("hola", { apiKey: "k", modelo: "m", enviar });

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

Deno.test("llamarIA devuelve la primera tool_call con sus argumentos ya leídos", async () => {
  const enviar = () => Promise.resolve(respuestaGroq(conLlamada("buscar_servicio", '{"oficio":"gasfitero"}')));
  const llamada = await llamarIA("busca gasfitero", { apiKey: "k", modelo: "m", enviar });
  assertEquals(llamada, { nombre: "buscar_servicio", argumentos: { oficio: "gasfitero" } });
});

Deno.test("llamarIA devuelve null si arguments no es JSON válido", async () => {
  const enviar = () => Promise.resolve(respuestaGroq(conLlamada("buscar_servicio", "{oficio: gasfitero")));
  assertEquals(await llamarIA("x", { apiKey: "k", modelo: "m", enviar }), null);
});

Deno.test("llamarIA devuelve null si la IA no pidió ninguna función", async () => {
  const enviar = () => Promise.resolve(respuestaGroq({ choices: [{ message: { content: "No sé." } }] }));
  assertEquals(await llamarIA("x", { apiKey: "k", modelo: "m", enviar }), null);
});

Deno.test("llamarIA lanza error si Groq responde con error HTTP", async () => {
  const enviar = () => Promise.resolve(respuestaGroq({ error: { message: "límite" } }, 429));
  await assertRejects(() => llamarIA("x", { apiKey: "k", modelo: "m", enviar }));
});

Deno.test("llamarIA lanza error si falta la clave", async () => {
  const enviar = () => Promise.resolve(respuestaGroq({}));
  await assertRejects(() => llamarIA("x", { apiKey: "", modelo: "m", enviar }));
});
