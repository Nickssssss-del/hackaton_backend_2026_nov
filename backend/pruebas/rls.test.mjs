/**
 * rls.test.mjs
 * Pruebas 1 a 20 de la sección 13. Solo usa la anon key.
 * Las 21 a 25 quedan fuera del MVP: no hay códigos SMS en la demo.
 * El bloque Mockup v4 cubre el script 07. Corre después de aplicarlo.
 */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import {
  ZONA_CERCADO,
  ZONA_PARCONA,
  clienteNuevo,
  crearVecino,
  entrarConCelular,
  mensaje,
  motivoDeSkip,
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

  test("Prueba 3: sin sesión, servicios_publicos no se puede leer", async () => {
    const { error } = await sinSesion
      .from("servicios_publicos")
      .select("contacto")
      .eq("id", servicioPublico)
      .maybeSingle();
    assert.equal(error.code, "42501");
    assert.match(error.message, /permission denied for view servicios_publicos/);
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

  test("Prueba 10: yo_ayudo sin celular verificado", async () => {
    const propio = await publicarPedido(ana.sb);
    assert.equal(propio.error, null, mensaje(propio.error));
    for (const quien of [ciro, ana, beto]) {
      const ayuda = await quien.sb.rpc("yo_ayudo", { p_pedido_id: propio.data.id });
      exigeRechazo(ayuda.error, "CELULAR_NO_VERIFICADO");
    }
  });

  test(
    "Prueba 10: otra zona, pedido propio y pedido cerrado",
    { skip: motivoDeSkip(["CELULARES_PRUEBA", "OTP_PRUEBA"]) },
    async () => {
      const verificado = await entrarConCelular({
        nombre: "Nilo Prado",
        zonaId: ZONA_PARCONA,
        lat: -14.045,
        lng: -75.698,
      });
      // La cuenta de celular de prueba se reutiliza entre corridas y el tope es de 2 pedidos abiertos.
      // Cada autor cancela los suyos (pedidos_editar): al inicio, todos los abiertos; al final, los creados aquí.
      const cancelarAbiertos = async (quien, ids) => {
        let consulta = quien.sb
          .from("pedidos_ayuda")
          .update({ estado: "cancelado" })
          .eq("autor", quien.id)
          .eq("estado", "abierto");
        if (ids) consulta = consulta.in("id", ids);
        const { error } = await consulta;
        assert.equal(error, null, mensaje(error));
      };
      await cancelarAbiertos(verificado);
      await cancelarAbiertos(ana);
      const deAna = [];
      const deVerificado = [];
      try {
        const ajeno = await publicarPedido(ana.sb);
        assert.equal(ajeno.error, null, mensaje(ajeno.error));
        deAna.push(ajeno.data.id);
        const zona = await verificado.sb.rpc("yo_ayudo", { p_pedido_id: ajeno.data.id });
        exigeRechazo(zona.error, "ZONA_DISTINTA");

        const propio = await publicarPedido(verificado.sb, { zonaId: ZONA_PARCONA });
        assert.equal(propio.error, null, mensaje(propio.error));
        deVerificado.push(propio.data.id);
        const mismo = await verificado.sb.rpc("yo_ayudo", { p_pedido_id: propio.data.id });
        exigeRechazo(mismo.error, "PEDIDO_NO_DISPONIBLE");

        const cerrado = await ana.sb
          .from("pedidos_ayuda")
          .update({ estado: "cancelado" })
          .eq("id", ajeno.data.id);
        assert.equal(cerrado.error, null, mensaje(cerrado.error));
        const despues = await verificado.sb.rpc("yo_ayudo", { p_pedido_id: ajeno.data.id });
        exigeRechazo(despues.error, "PEDIDO_NO_DISPONIBLE");
      } finally {
        if (deAna.length > 0) await cancelarAbiertos(ana, deAna);
        if (deVerificado.length > 0) await cancelarAbiertos(verificado, deVerificado);
      }
    },
  );

  test("Prueba 11: yo_ayudo exige celular verificado y no entrega el contacto", async () => {
    const pedido = await publicarPedido(ana.sb);
    assert.equal(pedido.error, null, mensaje(pedido.error));
    const ayuda = await beto.sb.rpc("yo_ayudo", { p_pedido_id: pedido.data.id });
    exigeRechazo(ayuda.error, "CELULAR_NO_VERIFICADO");
    assert.equal(ayuda.data, null);
    const recibidas = await ana.sb
      .from("ayudas_recibidas")
      .select("ayudante_celular")
      .eq("pedido_id", pedido.data.id);
    assert.equal(recibidas.error, null, mensaje(recibidas.error));
    assert.equal(recibidas.data.length, 0);
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
    const { data, error } = await ana.sb
      .from("servicios_publicos")
      .select("id")
      .eq("id", creado.data.id);
    assert.equal(error, null, mensaje(error));
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

  test("Prueba 18: sin sesión, servicios_publicos no se puede leer", async () => {
    const { error } = await sinSesion
      .from("servicios_publicos")
      .select("direccion")
      .eq("id", servicioPublico)
      .maybeSingle();
    assert.equal(error.code, "42501");
    assert.match(error.message, /permission denied for view servicios_publicos/);
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

describe("Mockup v4", { concurrency: false }, () => {
  let duena;
  let cerca;
  let lejos;
  let otraZona;
  let servicioId;
  let publicacionId;
  let comentarioId;

  before(async () => {
    duena = await crearVecino({
      nombre: "Rosa Quispe",
      celular: "900000021",
      zonaId: ZONA_CERCADO,
      lat: -14.068,
      lng: -75.728,
    });
    cerca = await crearVecino({
      nombre: "Luis Ramos",
      celular: "900000022",
      zonaId: ZONA_CERCADO,
      lat: -14.066,
      lng: -75.728,
    });
    lejos = await crearVecino({
      nombre: "Nico Farro",
      celular: "900000023",
      zonaId: ZONA_CERCADO,
      lat: -14.05,
      lng: -75.728,
    });
    otraZona = await crearVecino({
      nombre: "Gabi Ríos",
      celular: "900000024",
      zonaId: ZONA_PARCONA,
      lat: -14.045,
      lng: -75.698,
    });

    const servicio = await publicarServicio(duena.sb, {
      nombreNegocio: "Bodega Rosa",
      oficio: "bodega",
    });
    assert.equal(servicio.error, null, mensaje(servicio.error));
    servicioId = servicio.data.id;

    const publicacion = await duena.sb
      .from("publicaciones")
      .insert({ categoria: "kermes", mensaje: "Kermés del sábado en el parque." })
      .select("id")
      .single();
    assert.equal(publicacion.error, null, mensaje(publicacion.error));
    publicacionId = publicacion.data.id;

    const comentario = await duena.sb
      .from("comentarios")
      .insert({ publicacion_id: publicacionId, texto: "Llevo gaseosa." })
      .select("id")
      .single();
    assert.equal(comentario.error, null, mensaje(comentario.error));
    comentarioId = comentario.data.id;
  });

  test("Mockup v4: otra zona no ve negocios, publicaciones ni comentarios", async () => {
    const negocios = await otraZona.sb.from("servicios_publicos").select("id").eq("id", servicioId);
    assert.equal(negocios.error, null, mensaje(negocios.error));
    assert.equal(negocios.data.length, 0);
    const publicaciones = await otraZona.sb
      .from("publicaciones_cercanas")
      .select("id")
      .eq("id", publicacionId);
    assert.equal(publicaciones.error, null, mensaje(publicaciones.error));
    assert.equal(publicaciones.data.length, 0);
    const comentarios = await otraZona.sb
      .from("comentarios_visibles")
      .select("id")
      .eq("id", comentarioId);
    assert.equal(comentarios.error, null, mensaje(comentarios.error));
    assert.equal(comentarios.data.length, 0);

    const mismoBarrio = await cerca.sb.from("servicios_publicos").select("id").eq("id", servicioId);
    assert.equal(mismoBarrio.data.length, 1);
    const pubs = await cerca.sb.from("publicaciones_cercanas").select("id").eq("id", publicacionId);
    assert.equal(pubs.data.length, 1);
    const coms = await cerca.sb.from("comentarios_visibles").select("id").eq("id", comentarioId);
    assert.equal(coms.data.length, 1);
  });

  test("Mockup v4: voy_a_ayudar no revela ni registra si no se cumplen las condiciones", async () => {
    const verificado = await cerca.sb
      .from("perfiles")
      .update({ celular_verificado: true, alerta_vecinal: true })
      .eq("id", cerca.id)
      .select("celular_verificado, alerta_vecinal")
      .single();
    assert.equal(verificado.error, null, mensaje(verificado.error));
    assert.equal(verificado.data.celular_verificado, false);
    assert.equal(verificado.data.alerta_vecinal, true);

    await duena.sb.from("perfiles").update({ alerta_vecinal: true }).eq("id", duena.id);
    const emergencia = await duena.sb
      .from("emergencias")
      .insert({
        practica: false,
        nombre: "Rosa Quispe",
        direccion: "Calle Lima 245",
        lat: -14.068123,
        lng: -75.728456,
      })
      .select("id, avisar_vecinos")
      .single();
    assert.equal(emergencia.error, null, mensaje(emergencia.error));
    assert.equal(emergencia.data.avisar_vecinos, true);

    await lejos.sb.from("perfiles").update({ alerta_vecinal: true }).eq("id", lejos.id);
    const sinAlerta = await crearVecino({
      nombre: "Sara Nieto",
      celular: "900000025",
      zonaId: ZONA_CERCADO,
      lat: -14.066,
      lng: -75.728,
    });

    for (const quien of [cerca, lejos, sinAlerta]) {
      const ayuda = await quien.sb.rpc("voy_a_ayudar", {
        p_emergencia: emergencia.data.id,
        p_lat: -14.067,
        p_lng: -75.728,
      });
      exigeRechazo(ayuda.error, "CELULAR_NO_VERIFICADO");
      const registro = await quien.sb
        .from("vecinos_que_van")
        .select("id")
        .eq("emergencia_id", emergencia.data.id);
      assert.equal(registro.error, null, mensaje(registro.error));
      assert.equal(registro.data.length, 0);
    }

    const directo = await cerca.sb.from("vecinos_que_van").insert({
      emergencia_id: emergencia.data.id,
      vecino_id: cerca.id,
      estado: "va",
    });
    exigeRechazo(directo.error);
  });

  test("Mockup v4: el modo práctica no avisa a vecinos", async () => {
    await duena.sb.from("perfiles").update({ alerta_vecinal: true }).eq("id", duena.id);
    const practica = await duena.sb
      .from("emergencias")
      .insert({
        practica: true,
        nombre: "Rosa Quispe",
        direccion: "Calle Lima 245",
        lat: -14.068123,
        lng: -75.728456,
      })
      .select("id, practica, avisar_vecinos")
      .single();
    assert.equal(practica.error, null, mensaje(practica.error));
    assert.equal(practica.data.practica, true);
    assert.equal(practica.data.avisar_vecinos, false);

    const lista = await otraZona.sb.rpc("vecinos_para_alerta", { p_emergencia: practica.data.id });
    exigeRechazo(lista.error);
    const vistos = await cerca.sb.from("emergencias").select("id").eq("id", practica.data.id);
    assert.equal(vistos.data.length, 0);
  });

  test("Mockup v4: no se leen emergencias, eslabones ni enlaces ajenos", async () => {
    const emergencia = await duena.sb
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
    assert.equal(emergencia.error, null, mensaje(emergencia.error));
    const eslabon = await duena.sb
      .from("eslabones")
      .insert({ emergencia_id: emergencia.data.id, orden: 1, contacto: "Ana" })
      .select("id")
      .single();
    assert.equal(eslabon.error, null, mensaje(eslabon.error));
    const enlace = await duena.sb
      .from("enlaces")
      .insert({ emergencia_id: emergencia.data.id, eslabon_id: eslabon.data.id, contacto: "Ana" })
      .select("id")
      .single();
    assert.equal(enlace.error, null, mensaje(enlace.error));

    const emergencias = await otraZona.sb.from("emergencias").select("id").eq("id", emergencia.data.id);
    const eslabones = await otraZona.sb.from("eslabones").select("id").eq("emergencia_id", emergencia.data.id);
    const enlaces = await otraZona.sb.from("enlaces").select("id").eq("emergencia_id", emergencia.data.id);
    assert.equal(emergencias.data.length, 0);
    assert.equal(eslabones.data.length, 0);
    assert.equal(enlaces.data.length, 0);

    const propios = await duena.sb.from("eslabones").select("id").eq("id", eslabon.data.id);
    assert.equal(propios.data.length, 1);
  });

  test("Mockup v4: un vecino no puede bloquear y, sin fila en bloqueos, no recibe BLOQUEADO", async () => {
    const bloqueo = await cerca.sb.from("bloqueos").insert({
      user_id: cerca.id,
      motivo: "abuso de prueba",
    });
    exigeRechazo(bloqueo.error);

    const publicacion = await cerca.sb
      .from("publicaciones")
      .insert({ categoria: "taller", mensaje: "Taller de costura el domingo." })
      .select("id")
      .single();
    assert.equal(publicacion.error, null, mensaje(publicacion.error));
    const comentario = await cerca.sb
      .from("comentarios")
      .insert({ publicacion_id: publicacionId, texto: "Ahí estaré." })
      .select("id")
      .single();
    assert.equal(comentario.error, null, mensaje(comentario.error));

    const pedido = await publicarPedido(duena.sb);
    assert.equal(pedido.error, null, mensaje(pedido.error));
    const ayuda = await cerca.sb.rpc("yo_ayudo", { p_pedido_id: pedido.data.id });
    exigeRechazo(ayuda.error, "CELULAR_NO_VERIFICADO");
    assert.doesNotMatch(mensaje(ayuda.error), /BLOQUEADO/);
  });
});
