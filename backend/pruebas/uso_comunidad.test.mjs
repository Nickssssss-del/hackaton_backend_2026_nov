/**
 * uso_comunidad.test.mjs
 * Pruebas del script 10: tiempo de uso (uso_app, registrar_uso) y lugar del evento en publicaciones.
 * Lo que necesita admin queda en skip si faltan ADMIN_EMAIL o ADMIN_PASSWORD.
 */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { ZONA_CERCADO, crearVecino, entrarAdmin, mensaje, motivoDeSkip } from "./helpers.mjs";

function exigeRechazo(error, codigo) {
  assert.ok(error, "se esperaba un rechazo");
  if (codigo) assert.match(mensaje(error), new RegExp(codigo));
}

describe("Uso y comunidad (script 10)", { concurrency: false }, () => {
  let vecina;
  let autora;

  before(async () => {
    vecina = await crearVecino({
      nombre: "Rita Quispe",
      celular: "900000071",
      zonaId: ZONA_CERCADO,
      lat: -14.068,
      lng: -75.728,
    });
    autora = await crearVecino({
      nombre: "Sara Medina",
      celular: "900000072",
      zonaId: ZONA_CERCADO,
      lat: -14.067,
      lng: -75.729,
    });
  });

  test("registrar_uso rechaza menos de 5 y más de 14400 segundos, y acepta 60", async () => {
    exigeRechazo((await vecina.sb.rpc("registrar_uso", { p_segundos: 2 })).error, "USO_INVALIDO");
    exigeRechazo((await vecina.sb.rpc("registrar_uso", { p_segundos: 20000 })).error, "USO_INVALIDO");
    const valido = await vecina.sb.rpc("registrar_uso", { p_segundos: 60 });
    assert.equal(valido.error, null, mensaje(valido.error));
  });

  test("un vecino no puede leer uso_app", async () => {
    const { data, error } = await vecina.sb.from("uso_app").select("id");
    assert.equal(error, null, mensaje(error));
    assert.equal(data.length, 0);
  });

  test("un vecino no puede insertar directo en uso_app", async () => {
    const directo = await vecina.sb
      .from("uso_app")
      .insert({ zona_id: ZONA_CERCADO, fecha: "2026-11-08", hora: 10, segundos: 60 });
    exigeRechazo(directo.error);
  });

  test(
    "el admin lee uso_app y la fila no guarda quién la creó",
    { skip: motivoDeSkip(["ADMIN_EMAIL", "ADMIN_PASSWORD"]) },
    async () => {
      const admin = await entrarAdmin();
      const { data, error } = await admin.sb
        .from("uso_app")
        .select("*")
        .eq("zona_id", ZONA_CERCADO)
        .eq("segundos", 60)
        .order("creado_en", { ascending: false })
        .limit(1);
      assert.equal(error, null, mensaje(error));
      assert.equal(data.length, 1, "el admin debe ver la fila de registrar_uso(60)");
      assert.deepEqual(Object.keys(data[0]).sort(), ["creado_en", "fecha", "hora", "id", "segundos", "zona_id"]);
      assert.ok(data[0].hora >= 0 && data[0].hora <= 23);
    },
  );

  test("una publicación con lugar se guarda", async () => {
    const creada = await autora.sb
      .from("publicaciones")
      .insert({ categoria: "kermes", mensaje: "Kermés el domingo.", lugar: "Parque San Isidro" })
      .select("id, lugar")
      .single();
    assert.equal(creada.error, null, mensaje(creada.error));
    assert.equal(creada.data.lugar, "Parque San Isidro");

    // Al editar, un enlace en lugar también se rechaza (proteger_comunidad).
    const editada = await autora.sb
      .from("publicaciones")
      .update({ lugar: "Ver www.ejemplo.com" })
      .eq("id", creada.data.id);
    exigeRechazo(editada.error, "CON_ENLACE");
  });

  test("una publicación con un enlace en lugar se rechaza con CON_ENLACE", async () => {
    const creada = await autora.sb
      .from("publicaciones")
      .insert({ categoria: "taller", mensaje: "Taller de tejido.", lugar: "Inscríbete en https://ejemplo.com" });
    exigeRechazo(creada.error, "CON_ENLACE");
  });

  test("una publicación con lugar de más de 100 caracteres se rechaza", async () => {
    const creada = await autora.sb
      .from("publicaciones")
      .insert({ categoria: "misa", mensaje: "Misa del barrio.", lugar: "a".repeat(101) });
    exigeRechazo(creada.error);
  });
});
