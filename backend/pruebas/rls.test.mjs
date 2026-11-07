/**
 * rls.test.mjs
 * Pruebas 1 a 20 de la sección 13. Solo usa la anon key.
 * Las 21 a 25 quedan fuera del MVP: no hay códigos SMS en la demo.
 */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import {
  ZONA_CERCADO,
  ZONA_PARCONA,
  clienteNuevo,
  crearVecino,
  mensaje,
  publicarPedido,
  publicarServicio,
} from "./helpers.mjs";

function exigeRechazo(error, codigo) {
  assert.ok(error, "se esperaba un rechazo");
  if (codigo) assert.match(mensaje(error), new RegExp(codigo));
}

describe("RLS", { concurrency: false }, () => {
  /** @type {{ sb: import("@supabase/supabase-js").SupabaseClient, id: string, sesion: object }} */
  let ana;
  let beto;
  let ciro;
  let sinSesion;
  let servicioPublico;

  before(async () => {
    sinSesion = clienteNuevo();
    ana = await crearVecino({
      nombre: "Ana Pérez",
      celular: "900000011",
      zonaId: ZONA_CERCADO,
      lat: -14.068,
      lng: -75.728,
    });
    beto = await crearVecino({
      nombre: "Beto López",
      celular: "900000012",
      zonaId: ZONA_CERCADO,
      lat: -14.067,
      lng: -75.729,
    });
    ciro = await crearVecino({
      nombre: "Ciro Díaz",
      celular: "900000013",
      zonaId: ZONA_PARCONA,
      lat: -14.045,
      lng: -75.698,
    });
    const creado = await publicarServicio(ana.sb, {
      mostrarTelefono: false,
      mostrarDireccion: false,
    });
    assert.equal(creado.error, null);
    servicioPublico = creado.data.id;
  });

  test("Prueba 1: A intenta leer el perfil de B", async () => {
    const { data, error } = await ana.sb.from("perfiles").select("id").eq("id", beto.id);
    assert.equal(error, null);
    assert.equal(data.length, 0);
  });

  test("Prueba 2: A intenta cambiar su rol o insertarse en admins", async () => {
    const rol = await ana.sb.from("perfiles").update({ rol: "admin" }).eq("id", ana.id);
    assert.ok(rol.error);
    const admin = await ana.sb.from("admins").insert({ user_id: ana.id });
    exigeRechazo(admin.error);
  });

  test("Prueba 3: sin sesión, el contacto no se publica", async () => {
    const { data, error } = await sinSesion
      .from("servicios_publicos")
      .select("contacto")
      .eq("id", servicioPublico)
      .maybeSingle();
    assert.equal(error, null);
    assert.equal(data.contacto, null);
  });

  test("Prueba 4: sin sesión, leer la tabla servicios", async () => {
    const { data, error } = await sinSesion.from("servicios").select("id");
    assert.equal(error, null);
    assert.equal(data.length, 0);
  });

  test("Prueba 5: A vota su propio servicio", async () => {
    const voto = await ana.sb.from("vistos_buenos").insert({
      servicio_id: servicioPublico,
      motivo: "confiable",
    });
    exigeRechazo(voto.error, "VOTO_PROPIO");
  });

  test("Prueba 6: A vota dos veces el mismo servicio", async () => {
    const primero = await beto.sb.from("vistos_buenos").insert({
      servicio_id: servicioPublico,
      motivo: "buen_precio",
    });
    assert.equal(primero.error, null);
    const segundo = await beto.sb.from("vistos_buenos").insert({
      servicio_id: servicioPublico,
      motivo: "confiable",
    });
    exigeRechazo(segundo.error, "VOTO_REPETIDO");
  });

  test("Prueba 7: A, de otra zona, vota un servicio", async () => {
    const voto = await ciro.sb.from("vistos_buenos").insert({
      servicio_id: servicioPublico,
      motivo: "trato_amable",
    });
    exigeRechazo(voto.error, "ZONA_DISTINTA");
  });

  test("Prueba 8: perfil incompleto no publica, no vota y no pide", async () => {
    const incompleto = await crearVecino({ nombre: "Dina" });
    const servicio = await publicarServicio(incompleto.sb);
    exigeRechazo(servicio.error, "PERFIL_INCOMPLETO");
    const voto = await incompleto.sb.from("vistos_buenos").insert({
      servicio_id: servicioPublico,
      motivo: "confiable",
    });
    exigeRechazo(voto.error, "PERFIL_INCOMPLETO");
    const pedido = await publicarPedido(incompleto.sb);
    exigeRechazo(pedido.error, "PERFIL_INCOMPLETO");
  });

  test("Prueba 9: A intenta leer los vistos buenos de B", async () => {
    const { data, error } = await ana.sb
      .from("vistos_buenos")
      .select("id")
      .eq("vecino_id", beto.id);
    assert.equal(error, null);
    assert.equal(data.length, 0);
  });

  test("Prueba 10: yo_ayudo con otra zona, pedido cerrado o propio", async () => {
    const propio = await publicarPedido(ana.sb);
    assert.equal(propio.error, null);
    const ajeno = await ciro.sb.rpc("yo_ayudo", { p_pedido_id: propio.data.id });
    exigeRechazo(ajeno.error, "ZONA_DISTINTA");
    const mismo = await ana.sb.rpc("yo_ayudo", { p_pedido_id: propio.data.id });
    exigeRechazo(mismo.error, "PEDIDO_NO_DISPONIBLE");
    const cerrado = await ana.sb
      .from("pedidos_ayuda")
      .update({ estado: "cancelado" })
      .eq("id", propio.data.id);
    assert.equal(cerrado.error, null);
    const despues = await beto.sb.rpc("yo_ayudo", { p_pedido_id: propio.data.id });
    exigeRechazo(despues.error, "PEDIDO_NO_DISPONIBLE");
  });

  test("Prueba 11: yo_ayudo válido devuelve el contacto", async () => {
    const pedido = await publicarPedido(ana.sb);
    assert.equal(pedido.error, null);
    const ayuda = await beto.sb.rpc("yo_ayudo", { p_pedido_id: pedido.data.id });
    assert.equal(ayuda.error, null);
    assert.equal(ayuda.data[0].celular, "900000011");
    const visto = await ana.sb
      .from("ayudas_ofrecidas")
      .select("ayudante_id")
      .eq("pedido_id", pedido.data.id);
    assert.equal(visto.error, null);
    assert.equal(visto.data[0].ayudante_id, beto.id);
  });

  test("Prueba 12: publicar por encima del límite diario", async () => {
    const extra = await crearVecino({
      nombre: "Eva Ramos",
      celular: "900000014",
      zonaId: ZONA_CERCADO,
      lat: -14.068,
      lng: -75.728,
    });
    for (let i = 0; i < 3; i += 1) {
      const creado = await publicarServicio(extra.sb, { nombreNegocio: `Puesto ${i}` });
      assert.equal(creado.error, null, mensaje(creado.error));
    }
    const cuarto = await publicarServicio(extra.sb, { nombreNegocio: "Puesto de más" });
    exigeRechazo(cuarto.error, "LIMITE_DIARIO");
  });

  test("Prueba 13: tres reportes ocultan el servicio", async () => {
    const creado = await publicarServicio(beto.sb, { nombreNegocio: "Taller ficticio" });
    assert.equal(creado.error, null);
    for (const quien of [ana, beto, ciro]) {
      const reporte = await quien.sb.from("reportes").insert({
        servicio_id: creado.data.id,
        motivo: "estafa",
      });
      assert.equal(reporte.error, null, mensaje(reporte.error));
    }
    const { data, error } = await sinSesion
      .from("servicios_publicos")
      .select("id")
      .eq("id", creado.data.id);
    assert.equal(error, null);
    assert.equal(data.length, 0);
  });

  test("Prueba 14: la latitud se guarda con 3 decimales", async () => {
    const creado = await publicarServicio(beto.sb, {
      nombreNegocio: "Punto redondo",
      lat: -14.0678123,
      lng: -75.728,
    });
    assert.equal(creado.error, null, mensaje(creado.error));
    assert.equal(Number(creado.data.lat).toFixed(3), "-14.068");
  });

  test("Prueba 16: reabrir la sesión anónima no crea otro usuario", async () => {
    const nuevo = await crearVecino({
      nombre: "Fabián Cruz",
      celular: "900000015",
      zonaId: ZONA_CERCADO,
      lat: -14.068,
      lng: -75.728,
    });
    const otro = clienteNuevo();
    const sesion = await otro.auth.setSession({
      access_token: nuevo.sesion.access_token,
      refresh_token: nuevo.sesion.refresh_token,
    });
    assert.equal(sesion.error, null);
    const usuario = await otro.auth.getUser();
    assert.equal(usuario.data.user.id, nuevo.id);
    const perfil = await otro.from("perfiles").select("nombre").eq("id", nuevo.id).single();
    assert.equal(perfil.data.nombre, "Fabián Cruz");
  });

  test("Prueba 17: comentario largo, con enlace o motivo inválido", async () => {
    const creado = await publicarServicio(ciro.sb, { nombreNegocio: "Bodega ficticia" });
    assert.equal(creado.error, null, mensaje(creado.error));
    const votante = await crearVecino({
      nombre: "Gabi Ríos",
      celular: "900000016",
      zonaId: ZONA_PARCONA,
      lat: -14.045,
      lng: -75.698,
    });
    const largo = await votante.sb.from("vistos_buenos").insert({
      servicio_id: creado.data.id,
      motivo: "confiable",
      comentario: "a".repeat(141),
    });
    exigeRechazo(largo.error);
    const enlace = await votante.sb.from("vistos_buenos").insert({
      servicio_id: creado.data.id,
      motivo: "confiable",
      comentario: "mira www.ejemplo.com",
    });
    exigeRechazo(enlace.error, "CON_ENLACE");
    const motivo = await votante.sb.from("vistos_buenos").insert({
      servicio_id: creado.data.id,
      motivo: "gratis",
    });
    exigeRechazo(motivo.error, "MOTIVO_INVALIDO");
  });

  test("Prueba 18: sin sesión, la dirección no se publica", async () => {
    const { data, error } = await sinSesion
      .from("servicios_publicos")
      .select("direccion")
      .eq("id", servicioPublico)
      .maybeSingle();
    assert.equal(error, null);
    assert.equal(data.direccion, null);
  });

  test("Prueba 19: categoría fuera de la lista", async () => {
    const pedido = await beto.sb.from("pedidos_ayuda").insert({
      categoria: "fiesta",
      descripcion: "Esto no es una categoría.",
    });
    exigeRechazo(pedido.error);
  });

  test("Prueba 20: sin sesión no se ejecuta yo_ayudo ni borrar_mis_datos", async () => {
    const ayuda = await sinSesion.rpc("yo_ayudo", {
      p_pedido_id: "11111111-0000-4000-8000-000000000001",
    });
    exigeRechazo(ayuda.error);
    const borrado = await sinSesion.rpc("borrar_mis_datos");
    exigeRechazo(borrado.error);
  });

  test("Prueba 15: borrar_mis_datos solo borra al propio usuario", async () => {
    const propio = await ana.sb.from("servicios").select("id").eq("id", servicioPublico);
    assert.equal(propio.data.length, 1);
    const borrado = await ana.sb.rpc("borrar_mis_datos");
    assert.equal(borrado.error, null, mensaje(borrado.error));
    const despues = await ana.sb.from("servicios").select("id");
    assert.equal(despues.data.length, 0);
    const ajeno = await beto.sb.from("perfiles").select("id").eq("id", beto.id);
    assert.equal(ajeno.data.length, 1);
  });
});
