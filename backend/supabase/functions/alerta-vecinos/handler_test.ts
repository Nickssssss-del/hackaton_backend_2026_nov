// Pruebas sin red de alerta-vecinos: Supabase, Expo, la espera y el log son dobles inyectados.
// Correr: deno test backend/supabase/functions/alerta-vecinos/
import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  crearHandler,
  type Dependencias,
  type Destinatario,
  ErrorEnvio,
  type MensajePush,
  textoAviso,
  type Ticket,
} from "./handler.ts";

const EMERGENCIA = "11111111-0000-4000-8000-000000000001";

function pedido(cuerpo: unknown, init: RequestInit = {}) {
  return new Request("http://localhost/alerta-vecinos", {
    method: "POST",
    headers: { Authorization: "Bearer jwt-de-rosa", "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    ...init,
  });
}

function vecinos(n: number, distancia = 120): Destinatario[] {
  return Array.from({ length: n }, (_, i) => ({ token: `ExponentPushToken[secreto-${i}]`, distancia_m: distancia }));
}

const ok = (mensajes: MensajePush[]): Ticket[] => mensajes.map(() => ({ status: "ok" }));

/** Dependencias que registran lo que pasó. Por defecto: la emergencia es suya, el aviso se reclama y Expo responde ok. */
function dobles(parcial: Partial<Dependencias> = {}) {
  const registro = { lotes: [] as MensajePush[][], logs: [] as string[], esperas: [] as number[], reclamos: 0 };
  const deps: Dependencias = {
    esDeQuienLlama: () => Promise.resolve(true),
    reclamarAviso: () => {
      registro.reclamos++;
      return Promise.resolve(true);
    },
    destinatarios: () => Promise.resolve(vecinos(2)),
    enviarLote: (mensajes) => {
      registro.lotes.push(mensajes);
      return Promise.resolve(ok(mensajes));
    },
    esperar: (ms) => {
      registro.esperas.push(ms);
      return Promise.resolve();
    },
    log: (texto) => registro.logs.push(texto),
    ...parcial,
  };
  return { deps, registro };
}

// --- Entrada y permisos ---

Deno.test("un método que no es POST responde 405", async () => {
  const r = await crearHandler(dobles().deps)(new Request("http://localhost/alerta-vecinos"));
  assertEquals(r.status, 405);
  assertEquals((await r.json()).error, "METODO_INVALIDO");
});

Deno.test("sin Authorization responde 401", async () => {
  const r = await crearHandler(dobles().deps)(
    new Request("http://localhost/alerta-vecinos", { method: "POST", body: "{}" }),
  );
  assertEquals(r.status, 401);
  assertEquals((await r.json()).error, "SIN_SESION");
});

Deno.test("entrada inválida responde 400", async () => {
  const handler = crearHandler(dobles().deps);
  for (const cuerpo of [{ emergencia_id: "abc", tipo: "inicio" }, { emergencia_id: EMERGENCIA, tipo: "otro" }, {}]) {
    const r = await handler(pedido(cuerpo));
    assertEquals(r.status, 400);
    assertEquals((await r.json()).error, "ENTRADA_INVALIDA");
  }
  const roto = await handler(pedido(null, { body: "{no es json" }));
  assertEquals(roto.status, 400);
});

Deno.test("si la emergencia no es de quien llama responde 403 y no reclama el aviso", async () => {
  let recibido: unknown[] = [];
  const { deps, registro } = dobles({
    esDeQuienLlama: (...args) => {
      recibido = args;
      return Promise.resolve(false);
    },
  });
  const r = await crearHandler(deps)(pedido({ emergencia_id: EMERGENCIA, tipo: "inicio" }));
  assertEquals(r.status, 403);
  assertEquals((await r.json()).error, "NO_ES_TUYA");
  assertEquals(recibido, ["Bearer jwt-de-rosa", EMERGENCIA]);
  assertEquals(registro.reclamos, 0);
  assertEquals(registro.lotes.length, 0);
});

Deno.test("si falla la base responde 500 sin enviar nada", async () => {
  const { deps, registro } = dobles({ esDeQuienLlama: () => Promise.reject(new Error("db")) });
  const r = await crearHandler(deps)(pedido({ emergencia_id: EMERGENCIA, tipo: "inicio" }));
  assertEquals(r.status, 500);
  assertEquals((await r.json()).error, "ERROR_INTERNO");
  assertEquals(registro.lotes.length, 0);
});

Deno.test("si reclamar_aviso devuelve false responde avisados 0 sin buscar ni enviar", async () => {
  let busco = false;
  const { deps, registro } = dobles({
    reclamarAviso: () => Promise.resolve(false),
    destinatarios: () => {
      busco = true;
      return Promise.resolve(vecinos(3));
    },
  });
  const r = await crearHandler(deps)(pedido({ emergencia_id: EMERGENCIA, tipo: "cierre" }));
  assertEquals(r.status, 200);
  assertEquals(await r.json(), { avisados: 0 });
  assertEquals(busco, false);
  assertEquals(registro.lotes.length, 0);
});

// --- Textos y forma del mensaje ---

Deno.test("textoAviso redondea a 10 m con mínimo 10, y el cierre no lleva distancia", () => {
  assertEquals(textoAviso("inicio", 117), "Un vecino necesita ayuda a 120 m");
  assertEquals(textoAviso("inicio", 4), "Un vecino necesita ayuda a 10 m");
  assertEquals(textoAviso("inicio", 500), "Un vecino necesita ayuda a 500 m");
  assertEquals(textoAviso("cierre", 117), "Ya no hace falta, gracias");
});

Deno.test("el mensaje de inicio solo lleva token, texto y data con emergencia_id y tipo", async () => {
  const { deps, registro } = dobles({
    destinatarios: () => Promise.resolve([{ token: "ExponentPushToken[a]", distancia_m: 117 }]),
  });
  await crearHandler(deps)(pedido({ emergencia_id: EMERGENCIA, tipo: "inicio" }));
  const [mensaje] = registro.lotes[0];
  assertEquals(mensaje, {
    to: "ExponentPushToken[a]",
    title: "Kuna",
    body: "Un vecino necesita ayuda a 120 m",
    sound: "default",
    priority: "high",
    data: { emergencia_id: EMERGENCIA, tipo: "inicio" },
  });
});

Deno.test("el mensaje de cierre dice Ya no hace falta, gracias", async () => {
  const { deps, registro } = dobles();
  await crearHandler(deps)(pedido({ emergencia_id: EMERGENCIA, tipo: "cierre" }));
  assertEquals(registro.lotes[0].map((m) => m.body), ["Ya no hace falta, gracias", "Ya no hace falta, gracias"]);
  assertEquals(registro.lotes[0][0].data, { emergencia_id: EMERGENCIA, tipo: "cierre" });
});

// --- Lotes, conteo y reintento ---

Deno.test("250 destinatarios salen en lotes de 100, 100 y 50", async () => {
  const { deps, registro } = dobles({ destinatarios: () => Promise.resolve(vecinos(250)) });
  const r = await crearHandler(deps)(pedido({ emergencia_id: EMERGENCIA, tipo: "inicio" }));
  assertEquals(registro.lotes.map((l) => l.length), [100, 100, 50]);
  assertEquals(await r.json(), { avisados: 250 });
});

Deno.test("avisados cuenta solo los tickets ok y el log cuenta los DeviceNotRegistered sin tokens", async () => {
  const { deps, registro } = dobles({
    destinatarios: () => Promise.resolve(vecinos(3)),
    enviarLote: () =>
      Promise.resolve([
        { status: "ok" },
        { status: "error", message: "x", details: { error: "DeviceNotRegistered" } },
        { status: "error", message: "y", details: { error: "MessageRateExceeded" } },
      ]),
  });
  const r = await crearHandler(deps)(pedido({ emergencia_id: EMERGENCIA, tipo: "inicio" }));
  assertEquals(await r.json(), { avisados: 1 });
  const logs = registro.logs.join("\n");
  assert(logs.includes("no_registrados=1"), logs);
  assert(!logs.includes("ExponentPushToken"), "el log no debe tener tokens");
  assert(!logs.includes("120"), "el log no debe tener distancias");
});

Deno.test("un lote que falla por red se reintenta una vez tras 1 s", async () => {
  let intentos = 0;
  const { deps, registro } = dobles({
    enviarLote: (mensajes) => {
      intentos++;
      return intentos === 1 ? Promise.reject(new TypeError("red")) : Promise.resolve(ok(mensajes));
    },
  });
  const r = await crearHandler(deps)(pedido({ emergencia_id: EMERGENCIA, tipo: "inicio" }));
  assertEquals(intentos, 2);
  assertEquals(registro.esperas, [1000]);
  assertEquals(await r.json(), { avisados: 2 });
});

Deno.test("un 5xx que vuelve a fallar se registra y se sigue con el siguiente lote", async () => {
  let intentos = 0;
  const { deps, registro } = dobles({
    destinatarios: () => Promise.resolve(vecinos(150)),
    enviarLote: (mensajes) => {
      intentos++;
      // El primer lote falla dos veces; el segundo sale bien.
      return intentos <= 2 ? Promise.reject(new ErrorEnvio(true, "EXPO_HTTP_503")) : Promise.resolve(ok(mensajes));
    },
  });
  const r = await crearHandler(deps)(pedido({ emergencia_id: EMERGENCIA, tipo: "inicio" }));
  assertEquals(intentos, 3);
  assertEquals(await r.json(), { avisados: 50 });
  assert(registro.logs.some((l) => l.includes("LOTE_FALLIDO")), registro.logs.join("\n"));
});

Deno.test("un 4xx de Expo no se reintenta", async () => {
  let intentos = 0;
  const { deps, registro } = dobles({
    enviarLote: () => {
      intentos++;
      return Promise.reject(new ErrorEnvio(false, "EXPO_HTTP_400"));
    },
  });
  const r = await crearHandler(deps)(pedido({ emergencia_id: EMERGENCIA, tipo: "inicio" }));
  assertEquals(intentos, 1);
  assertEquals(registro.esperas, []);
  assertEquals(await r.json(), { avisados: 0 });
});
