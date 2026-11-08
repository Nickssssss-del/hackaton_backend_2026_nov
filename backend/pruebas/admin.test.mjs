/**
 * admin.test.mjs
 * Lectura de perfiles (script 11) y de emergencias cerradas ajenas.
 * El admin entra solo si existen ADMIN_EMAIL y ADMIN_PASSWORD.
 * Los vecinos de prueba se borran al terminar con borrar_mis_datos().
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { ZONA_CERCADO, crearVecino, entrarAdmin, mensaje, motivoDeSkip } from "./helpers.mjs";

describe("Admin", { concurrency: false }, () => {
  let duena;
  let otro;

  before(async () => {
    duena = await crearVecino({
      nombre: "Rosa Quispe",
      celular: "900000061",
      zonaId: ZONA_CERCADO,
      lat: -14.068,
      lng: -75.728,
    });
    otro = await crearVecino({
      nombre: "Luis Navarro",
      celular: "900000062",
      zonaId: ZONA_CERCADO,
      lat: -14.069,
      lng: -75.729,
    });
  });

  after(async () => {
    if (duena) await duena.sb.rpc("borrar_mis_datos");
    if (otro) await otro.sb.rpc("borrar_mis_datos");
  });

  test(
    "el admin lee perfiles de otros usuarios",
    { skip: motivoDeSkip(["ADMIN_EMAIL", "ADMIN_PASSWORD"]) },
    async () => {
      const admin = await entrarAdmin();
      const lectura = await admin.sb.from("perfiles").select("id").in("id", [duena.id, otro.id]);
      assert.equal(lectura.error, null, mensaje(lectura.error));
      assert.deepEqual(lectura.data.map((fila) => fila.id).sort(), [duena.id, otro.id].sort());
    },
  );

  test("un vecino solo lee su propio perfil", async () => {
    const lectura = await otro.sb.from("perfiles").select("id");
    assert.equal(lectura.error, null, mensaje(lectura.error));
    assert.deepEqual(
      lectura.data.map((fila) => fila.id),
      [otro.id],
    );
  });

  test("un vecino no lee emergencias cerradas ajenas", async () => {
    const creada = await duena.sb
      .from("emergencias")
      .insert({
        practica: false,
        nombre: "Rosa Quispe",
        direccion: "Calle Lima 245",
        lat: -14.068123,
        lng: -75.728456,
      })
      .select("id")
      .single();
    assert.equal(creada.error, null, mensaje(creada.error));

    const cerrada = await duena.sb.rpc("cerrar_emergencia", { p_emergencia: creada.data.id });
    assert.equal(cerrada.error, null, mensaje(cerrada.error));
    assert.equal(cerrada.data, true);

    const propia = await duena.sb.from("emergencias").select("id, estado").eq("id", creada.data.id).single();
    assert.equal(propia.error, null, mensaje(propia.error));
    assert.equal(propia.data.estado, "cerrada");

    const ajena = await otro.sb.from("emergencias").select("id").eq("id", creada.data.id);
    assert.equal(ajena.error, null, mensaje(ajena.error));
    assert.equal(ajena.data.length, 0);
  });
});
