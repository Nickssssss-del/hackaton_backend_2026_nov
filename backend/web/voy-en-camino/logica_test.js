// Pruebas sin red de la lógica de la página «Voy en camino».
// Correr: deno test backend/web/voy-en-camino/
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  estadoDesdeError,
  estadoDesdeVer,
  estadoTrasVoy,
  leerToken,
  llamarRpc,
  textoAyuda,
  textoGracias,
  urlMapa,
} from "./logica.js";

const TOKEN = "0123456789abcdef".repeat(4); // 64 hexadecimales, como el default de enlaces.token
const CONFIG = { SUPABASE_URL: "https://demo.supabase.co/", SUPABASE_PUBLISHABLE_KEY: "clave-publicable" };

// --- leerToken ---

Deno.test("leerToken devuelve el token de ?t= si tiene 64 hexadecimales", () => {
  assertEquals(leerToken(`?t=${TOKEN}`), TOKEN);
  assertEquals(leerToken(`?otro=1&t=${TOKEN}`), TOKEN);
});

Deno.test("leerToken devuelve null si falta o no tiene el formato", () => {
  assertEquals(leerToken(""), null);
  assertEquals(leerToken("?t="), null);
  assertEquals(leerToken("?t=abc"), null);
  assertEquals(leerToken(`?t=${TOKEN}0`), null);
  assertEquals(leerToken(`?t=${TOKEN.toUpperCase()}`), null);
  assertEquals(leerToken(`?t=${TOKEN.slice(0, 63)}z`), null);
});

// --- textos y mapa ---

Deno.test("textoAyuda y textoGracias usan el nombre, o «Tu familiar» si falta", () => {
  assertEquals(textoAyuda("Rosa"), "Rosa necesita ayuda");
  assertEquals(textoGracias("Rosa"), "Gracias, Rosa sabe que vas");
  assertEquals(textoAyuda(null), "Tu familiar necesita ayuda");
  assertEquals(textoGracias("   "), "Gracias, Tu familiar sabe que vas");
});

Deno.test("urlMapa arma la URL de Google Maps o devuelve null sin coordenadas", () => {
  assertEquals(urlMapa(-14.068123, -75.728456), "https://www.google.com/maps?q=-14.068123,-75.728456");
  assertEquals(urlMapa("-14.068123", "-75.728456"), "https://www.google.com/maps?q=-14.068123,-75.728456");
  assertEquals(urlMapa(null, -75.7), null);
  assertEquals(urlMapa(-14.0, undefined), null);
  assertEquals(urlMapa("abc", 1), null);
});

// --- estados ---

Deno.test("estadoDesdeVer: sin aviso previo muestra la pantalla de ayuda", () => {
  const estado = estadoDesdeVer([
    { nombre: "Rosa", direccion: " Calle Lima 245 ", lat: -14.068123, lng: -75.728456, va_en_camino: false },
  ]);
  assertEquals(estado, {
    tipo: "ayuda",
    nombre: "Rosa",
    titulo: "Rosa necesita ayuda",
    direccion: "Calle Lima 245",
    mapa: "https://www.google.com/maps?q=-14.068123,-75.728456",
  });
});

Deno.test("estadoDesdeVer: si ya avisó que va, muestra gracias", () => {
  const estado = estadoDesdeVer([{ nombre: "Rosa", direccion: null, lat: null, lng: null, va_en_camino: true }]);
  assertEquals(estado, { tipo: "gracias", nombre: "Rosa", titulo: "Gracias, Rosa sabe que vas", direccion: null, mapa: null });
});

Deno.test("estadoDesdeVer: sin filas, la emergencia terminó", () => {
  assertEquals(estadoDesdeVer([]).tipo, "terminada");
  assertEquals(estadoDesdeVer(null).tipo, "terminada");
});

Deno.test("estadoTrasVoy pasa de ayuda a gracias y conserva dirección y mapa", () => {
  const ayuda = estadoDesdeVer([{ nombre: "Rosa", direccion: "Calle Lima 245", lat: -14, lng: -75, va_en_camino: false }]);
  assertEquals(estadoTrasVoy(ayuda), {
    ...ayuda,
    tipo: "gracias",
    titulo: "Gracias, Rosa sabe que vas",
  });
});

Deno.test("estadoDesdeError distingue terminada, sin conexión y error", () => {
  assertEquals(estadoDesdeError(new Error("EMERGENCIA_TERMINADA")).tipo, "terminada");
  assertEquals(estadoDesdeError(new TypeError("Failed to fetch")).tipo, "sin_conexion");
  assertEquals(estadoDesdeError(new Error("HTTP_500")).tipo, "error");
  assertEquals(estadoDesdeError(new Error("HTTP_500")).titulo, "Algo salió mal. Inténtalo otra vez.");
  assertEquals(estadoDesdeError(new TypeError("x")).titulo, "No hay conexión. Revisa tu internet.");
  assertEquals(estadoDesdeError(new Error("EMERGENCIA_TERMINADA")).titulo, "Esta emergencia ya terminó");
});

Deno.test("estadoDesdeError trata el tope de tiempo como sin conexión", () => {
  assertEquals(estadoDesdeError(new DOMException("tarde", "TimeoutError")).tipo, "sin_conexion");
});

Deno.test("llamarRpc pone un tope de tiempo a la petición", async () => {
  let init = {};
  const enviar = (_u, i) => {
    init = i;
    return Promise.resolve(new Response("true", { status: 200 }));
  };
  await llamarRpc(CONFIG, "enlace_ver", TOKEN, enviar);
  assertEquals(init.signal instanceof AbortSignal, true);
});

// --- llamarRpc ---

Deno.test("llamarRpc hace POST a /rest/v1/rpc con apikey, JSON y p_token", async () => {
  let url = "";
  let init = {};
  const enviar = (u, i) => {
    url = u;
    init = i;
    return Promise.resolve(new Response(JSON.stringify(true), { status: 200 }));
  };
  const resultado = await llamarRpc(CONFIG, "enlace_voy", TOKEN, enviar);

  assertEquals(resultado, true);
  assertEquals(url, "https://demo.supabase.co/rest/v1/rpc/enlace_voy");
  assertEquals(init.method, "POST");
  assertEquals(init.headers, { apikey: "clave-publicable", "Content-Type": "application/json" });
  assertEquals(JSON.parse(init.body), { p_token: TOKEN });
  assertEquals(init.credentials, "omit");
});

Deno.test("llamarRpc lanza el message de la base cuando responde con error", async () => {
  const enviar = () =>
    Promise.resolve(
      new Response(JSON.stringify({ code: "P0001", message: "EMERGENCIA_TERMINADA" }), { status: 400 }),
    );
  await assertRejects(() => llamarRpc(CONFIG, "enlace_ver", TOKEN, enviar), Error, "EMERGENCIA_TERMINADA");
});

Deno.test("llamarRpc lanza HTTP_estado si el error no trae JSON", async () => {
  const enviar = () => Promise.resolve(new Response("<html>caído</html>", { status: 502 }));
  await assertRejects(() => llamarRpc(CONFIG, "enlace_ver", TOKEN, enviar), Error, "HTTP_502");
});
