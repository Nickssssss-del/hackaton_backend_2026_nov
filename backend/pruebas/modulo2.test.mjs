/**
 * modulo2.test.mjs
 * Pruebas del script 08. Los vecinos se crean una vez y se reutilizan.
 * Celular verificado, admin y service_role quedan en skip si falta la variable.
 */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import {
  ZONA_CERCADO,
  ZONA_PARCONA,
  clienteNuevo,
  clienteServiceRole,
  crearVecino,
  entrarAdmin,
  entrarConCelular,
  mensaje,
  motivoDeSkip,
} from "./helpers.mjs";

function exigeRechazo(error, codigo) {
  assert.ok(error, "se esperaba un rechazo");
  if (codigo) assert.match(mensaje(error), new RegExp(codigo));
}

async function vecino(nombre, celular, zonaId = ZONA_CERCADO) {
  return crearVecino({
    nombre,
    celular,
    zonaId,
    lat: zonaId === ZONA_CERCADO ? -14.068 : -14.045,
    lng: zonaId === ZONA_CERCADO ? -75.728 : -75.698,
  });
}

async function publicar(quien, mensajeTexto) {
  const creado = await quien.sb
    .from("publicaciones")
    .insert({ categoria: "kermes", mensaje: mensajeTexto })
    .select("id")
    .single();
  assert.equal(creado.error, null, mensaje(creado.error));
  return creado.data.id;
}

function emergencia(sb, practica, nombre) {
  return sb
    .from("emergencias")
    .insert({
      practica,
      nombre,
      direccion: "Calle Lima 245",
      lat: -14.068123,
      lng: -75.728456,
    })
    .select("id")
    .single();
}

describe("Módulo 2", { concurrency: false }, () => {
  let autora;
  let uno;
  let dos;
  let tres;
  let fuera;
  let autores;
  let reportera;
  let publicacionOculta;

  before(async () => {
    autora = await vecino("Iris Solís", "900000031");
    uno = await vecino("Juan Paredes", "900000032");
    dos = await vecino("Kenji Mora", "900000033");
    tres = await vecino("Luz Cabrera", "900000034");
    fuera = await vecino("Omar Ruiz", "900000043", ZONA_PARCONA);
    autores = [];
    for (let i = 0; i < 4; i += 1) {
      autores.push(await vecino(`Autora ${i}`, `90000005${i + 2}`));
    }
    reportera = await vecino("Paula Ríos", "900000051");
  });

  test("tres vecinos distintos ocultan una publicación y un comentario", async () => {
    const publicacionId = await publicar(autora, "Kermés del barrio el domingo.");
    const comentario = await autora.sb
      .from("comentarios")
      .insert({ publicacion_id: publicacionId, texto: "Llevo queque." })
      .select("id")
      .single();
    assert.equal(comentario.error, null, mensaje(comentario.error));

    const primero = await uno.sb.from("reportes_comunidad").insert({
      publicacion_id: publicacionId,
      motivo: "spam",
    });
    assert.equal(primero.error, null, mensaje(primero.error));
    const repetido = await uno.sb.from("reportes_comunidad").insert({
      publicacion_id: publicacionId,
      motivo: "ofensivo",
    });
    assert.ok(repetido.error, "el mismo vecino no cuenta dos veces");

    const visible = await dos.sb.from("publicaciones_cercanas").select("id").eq("id", publicacionId);
    assert.equal(visible.data.length, 1);

    const segundo = await dos.sb.from("reportes_comunidad").insert({
      publicacion_id: publicacionId,
      motivo: "falso",
    });
    assert.equal(segundo.error, null, mensaje(segundo.error));
    const borrado = await uno.sb.from("reportes_comunidad").delete().eq("publicacion_id", publicacionId);
    assert.equal(borrado.error, null, mensaje(borrado.error));

    const tercero = await tres.sb.from("reportes_comunidad").insert({
      publicacion_id: publicacionId,
      motivo: "abuso",
    });
    assert.equal(tercero.error, null, mensaje(tercero.error));
    const oculta = await dos.sb.from("publicaciones_cercanas").select("id").eq("id", publicacionId);
    assert.equal(oculta.data.length, 0);
    const propia = await autora.sb
      .from("publicaciones")
      .select("oculto, revisado_en")
      .eq("id", publicacionId)
      .single();
    assert.equal(propia.data.oculto, true);
    publicacionOculta = publicacionId;

    const otra = await publicar(autora, "Taller de lectura el sábado.");
    const nota = await uno.sb
      .from("comentarios")
      .insert({ publicacion_id: otra, texto: "Un comentario visible." })
      .select("id")
      .single();
    assert.equal(nota.error, null, mensaje(nota.error));
    for (const quien of [autora, dos, tres]) {
      const reporte = await quien.sb.from("reportes_comunidad").insert({
        comentario_id: nota.data.id,
        motivo: "ofensivo",
      });
      assert.equal(reporte.error, null, mensaje(reporte.error));
    }
    const comentarios = await uno.sb.from("comentarios_visibles").select("id").eq("id", nota.data.id);
    assert.equal(comentarios.data.length, 0);

    const mostrar = await autora.sb
      .from("publicaciones")
      .update({ oculto: false })
      .eq("id", publicacionId)
      .select("oculto, revisado_en")
      .single();
    assert.equal(mostrar.error, null, mensaje(mostrar.error));
    assert.equal(mostrar.data.oculto, true);
    assert.equal(mostrar.data.revisado_en, null);
  });

  test("reportar lo propio, otra zona o a quien no ayudó", async () => {
    const publicacionId = await publicar(autora, "Misa del barrio el domingo.");
    const comentario = await autora.sb
      .from("comentarios")
      .insert({ publicacion_id: publicacionId, texto: "Ahí nos vemos." })
      .select("id")
      .single();
    assert.equal(comentario.error, null, mensaje(comentario.error));

    const propia = await autora.sb.from("reportes_comunidad").insert({
      publicacion_id: publicacionId,
      motivo: "otro",
    });
    exigeRechazo(propia.error, "PUBLICACION_NO_DISPONIBLE");
    const propio = await autora.sb.from("reportes_comunidad").insert({
      comentario_id: comentario.data.id,
      motivo: "otro",
    });
    exigeRechazo(propio.error, "COMENTARIO_NO_DISPONIBLE");
    const zona = await fuera.sb.from("reportes_comunidad").insert({
      publicacion_id: publicacionId,
      motivo: "spam",
    });
    exigeRechazo(zona.error, "ZONA_DISTINTA");
    const persona = await uno.sb.from("reportes_comunidad").insert({
      usuario_id: autora.id,
      motivo: "abuso",
    });
    exigeRechazo(persona.error, "REPORTE_NO_VALIDO");
    const sigue = await uno.sb.from("publicaciones_cercanas").select("id").eq("id", publicacionId);
    assert.equal(sigue.data.length, 1);

    const lectura = await uno.sb.from("reportes_comunidad").select("id");
    assert.equal(lectura.error, null, mensaje(lectura.error));
    assert.equal(lectura.data.length, 0);
  });

  test("el undécimo reporte del día da LIMITE_DIARIO", async () => {
    const ids = [];
    for (const quien of autores) {
      for (let n = 0; n < 3; n += 1) {
        ids.push(await publicar(quien, `Aviso ${quien.id.slice(0, 4)} ${n}.`));
      }
    }
    for (let i = 0; i < 10; i += 1) {
      const reporte = await reportera.sb.from("reportes_comunidad").insert({
        publicacion_id: ids[i],
        motivo: "spam",
      });
      assert.equal(reporte.error, null, mensaje(reporte.error));
    }
    const once = await reportera.sb.from("reportes_comunidad").insert({
      publicacion_id: ids[10],
      motivo: "spam",
    });
    exigeRechazo(once.error, "LIMITE_DIARIO");
  });

  test("la sexta emergencia real en una hora da LIMITE_EMERGENCIAS y la práctica no cuenta", async () => {
    for (let i = 0; i < 5; i += 1) {
      const creada = await emergencia(dos.sb, false, "Kenji Mora");
      assert.equal(creada.error, null, mensaje(creada.error));
    }
    const sexta = await emergencia(dos.sb, false, "Kenji Mora");
    exigeRechazo(sexta.error, "LIMITE_EMERGENCIAS");
    const practica = await emergencia(dos.sb, true, "Kenji Mora");
    assert.equal(practica.error, null, mensaje(practica.error));

    for (let i = 0; i < 5; i += 1) {
      const creada = await emergencia(tres.sb, true, "Luz Cabrera");
      assert.equal(creada.error, null, mensaje(creada.error));
    }
    const despues = await emergencia(tres.sb, false, "Luz Cabrera");
    assert.equal(despues.error, null, mensaje(despues.error));
  });

  test("anon y authenticated no ejecutan reclamar_aviso", async () => {
    const creada = await emergencia(tres.sb, false, "Luz Cabrera");
    assert.equal(creada.error, null, mensaje(creada.error));
    const anon = await clienteNuevo().rpc("reclamar_aviso", {
      p_emergencia: creada.data.id,
      p_tipo: "inicio",
    });
    exigeRechazo(anon.error);
    const sesion = await tres.sb.rpc("reclamar_aviso", {
      p_emergencia: creada.data.id,
      p_tipo: "raro",
    });
    exigeRechazo(sesion.error);
  });

  test("enlace_ver y enlace_voy funcionan con token y fallan si ya no sirve", async () => {
    const creada = await emergencia(tres.sb, false, "Luz Cabrera");
    assert.equal(creada.error, null, mensaje(creada.error));
    const eslabon = await tres.sb
      .from("eslabones")
      .insert({ emergencia_id: creada.data.id, orden: 1, contacto: "Ana" })
      .select("id")
      .single();
    assert.equal(eslabon.error, null, mensaje(eslabon.error));
    const enlace = await tres.sb
      .from("enlaces")
      .insert({ emergencia_id: creada.data.id, eslabon_id: eslabon.data.id, contacto: "Ana" })
      .select("token")
      .single();
    assert.equal(enlace.error, null, mensaje(enlace.error));

    const anon = clienteNuevo();
    const visto = await anon.rpc("enlace_ver", { p_token: enlace.data.token });
    assert.equal(visto.error, null, mensaje(visto.error));
    assert.equal(visto.data[0].nombre, "Luz Cabrera");
    assert.equal(visto.data[0].va_en_camino, false);

    const voy = await anon.rpc("enlace_voy", { p_token: enlace.data.token });
    assert.equal(voy.error, null, mensaje(voy.error));
    assert.equal(voy.data, true);
    const cadena = await tres.sb.from("eslabones").select("estado").eq("id", eslabon.data.id).single();
    assert.equal(cadena.data.estado, "va_en_camino");
    const marca = await tres.sb.from("enlaces").select("va_en_camino_en").eq("token", enlace.data.token).single();
    assert.ok(marca.data.va_en_camino_en);

    const falso = "ab".repeat(32);
    const inexistente = await anon.rpc("enlace_ver", { p_token: falso });
    exigeRechazo(inexistente.error, "EMERGENCIA_TERMINADA");

    const cerrada = await tres.sb.rpc("cerrar_emergencia", { p_emergencia: creada.data.id });
    assert.equal(cerrada.error, null, mensaje(cerrada.error));
    const despues = await anon.rpc("enlace_ver", { p_token: enlace.data.token });
    exigeRechazo(despues.error, "EMERGENCIA_TERMINADA");
  });

  test("registrar_push_token reasigna el token y exige perfil", async () => {
    const token = `tokendeprueba${autora.id.replace(/-/g, "").slice(0, 8)}`;
    const alta = await autora.sb.rpc("registrar_push_token", { p_token: token, p_plataforma: "android" });
    assert.equal(alta.error, null, mensaje(alta.error));
    assert.equal(alta.data, true);
    const propio = await autora.sb.from("push_tokens").select("token").eq("token", token);
    assert.equal(propio.data.length, 1);
    const ajeno = await uno.sb.from("push_tokens").select("token").eq("token", token);
    assert.equal(ajeno.data.length, 0);

    const reasignado = await uno.sb.rpc("registrar_push_token", { p_token: token, p_plataforma: "ios" });
    assert.equal(reasignado.error, null, mensaje(reasignado.error));
    const yaNo = await autora.sb.from("push_tokens").select("token").eq("token", token);
    assert.equal(yaNo.data.length, 0);
    const ahora = await uno.sb.from("push_tokens").select("token, plataforma").eq("token", token).single();
    assert.equal(ahora.data.plataforma, "ios");

    const sinPerfil = clienteNuevo();
    const ingreso = await sinPerfil.auth.signInAnonymously();
    assert.equal(ingreso.error, null, mensaje(ingreso.error));
    const incompleto = await sinPerfil.rpc("registrar_push_token", {
      p_token: "otrotokenprueba1",
      p_plataforma: "android",
    });
    exigeRechazo(incompleto.error, "PERFIL_INCOMPLETO");
  });

  test("un tercero no ve ayudas_recibidas", async () => {
    const pedido = await autora.sb
      .from("pedidos_ayuda")
      .insert({ categoria: "arreglos", descripcion: "Se soltó una puerta." })
      .select("id")
      .single();
    assert.equal(pedido.error, null, mensaje(pedido.error));
    const ayuda = await uno.sb.rpc("yo_ayudo", { p_pedido_id: pedido.data.id });
    exigeRechazo(ayuda.error, "CELULAR_NO_VERIFICADO");
    const propias = await autora.sb.from("ayudas_recibidas").select("id").eq("pedido_id", pedido.data.id);
    assert.equal(propias.data.length, 0);
    const ajenas = await uno.sb.from("ayudas_recibidas").select("id");
    assert.equal(ajenas.error, null, mensaje(ajenas.error));
    assert.equal(ajenas.data.length, 0);
  });

  test(
    "yo_ayudo verificado devuelve true y el pedido ve el celular",
    { skip: motivoDeSkip(["CELULARES_PRUEBA", "OTP_PRUEBA"]) },
    async () => {
      const ayudante = await entrarConCelular({
        nombre: "Nilo Prado",
        zonaId: ZONA_CERCADO,
        lat: -14.068,
        lng: -75.728,
      });
      const pedido = await autora.sb
        .from("pedidos_ayuda")
        .insert({ categoria: "arreglos", descripcion: "Se soltó una puerta." })
        .select("id")
        .single();
      assert.equal(pedido.error, null, mensaje(pedido.error));
      const ayuda = await ayudante.sb.rpc("yo_ayudo", { p_pedido_id: pedido.data.id });
      assert.equal(ayuda.error, null, mensaje(ayuda.error));
      assert.equal(ayuda.data, true);
      const recibidas = await autora.sb
        .from("ayudas_recibidas")
        .select("ayudante_celular")
        .eq("pedido_id", pedido.data.id);
      assert.equal(recibidas.data.length, 1);
      assert.equal(recibidas.data[0].ayudante_celular, ayudante.celular);
      const ajenas = await uno.sb.from("ayudas_recibidas").select("id").eq("pedido_id", pedido.data.id);
      assert.equal(ajenas.data.length, 0);

      const aviso = await publicar(dos, "Aviso que un reporte de persona no oculta.");
      const reporte = await autora.sb.from("reportes_comunidad").insert({
        usuario_id: ayudante.id,
        motivo: "abuso",
      });
      assert.equal(reporte.error, null, mensaje(reporte.error));
      const sigue = await uno.sb.from("publicaciones_cercanas").select("id").eq("id", aviso);
      assert.equal(sigue.data.length, 1);
    },
  );

  test(
    "un admin lee, borra y al mostrar de nuevo los reportes viejos no cuentan",
    { skip: motivoDeSkip(["ADMIN_EMAIL", "ADMIN_PASSWORD"]) },
    async () => {
      const admin = await entrarAdmin();
      const lectura = await admin.sb
        .from("reportes_comunidad")
        .select("id")
        .eq("publicacion_id", publicacionOculta);
      assert.equal(lectura.error, null, mensaje(lectura.error));
      assert.ok(lectura.data.length >= 3);

      const mostrar = await admin.sb
        .from("publicaciones")
        .update({ oculto: false })
        .eq("id", publicacionOculta)
        .select("oculto, revisado_en")
        .single();
      assert.equal(mostrar.error, null, mensaje(mostrar.error));
      assert.equal(mostrar.data.oculto, false);
      assert.ok(mostrar.data.revisado_en);

      const visible = await uno.sb.from("publicaciones_cercanas").select("id").eq("id", publicacionOculta);
      assert.equal(visible.data.length, 1);

      const nuevo = await vecino("Quique Salas", "900000091");
      const reporte = await nuevo.sb.from("reportes_comunidad").insert({
        publicacion_id: publicacionOculta,
        motivo: "spam",
      });
      assert.equal(reporte.error, null, mensaje(reporte.error));
      const sigue = await uno.sb.from("publicaciones_cercanas").select("id").eq("id", publicacionOculta);
      assert.equal(sigue.data.length, 1);

      const borrado = await admin.sb
        .from("reportes_comunidad")
        .delete()
        .eq("publicacion_id", publicacionOculta)
        .select("id");
      assert.equal(borrado.error, null, mensaje(borrado.error));
      assert.ok(borrado.data.length >= 1);
      const quedan = await admin.sb.from("reportes_comunidad").select("id").eq("publicacion_id", publicacionOculta);
      assert.equal(quedan.data.length, 0);
    },
  );

  test(
    "un ayudante bloqueado deja de aparecer en ayudas_recibidas",
    { skip: motivoDeSkip(["CELULARES_PRUEBA", "OTP_PRUEBA", "ADMIN_EMAIL", "ADMIN_PASSWORD"]) },
    async () => {
      const ayudante = await entrarConCelular({
        nombre: "Nilo Prado",
        zonaId: ZONA_CERCADO,
        lat: -14.068,
        lng: -75.728,
      });
      const pedido = await autora.sb
        .from("pedidos_ayuda")
        .insert({ categoria: "arreglos", descripcion: "Falta una bisagra." })
        .select("id")
        .single();
      assert.equal(pedido.error, null, mensaje(pedido.error));
      const ayuda = await ayudante.sb.rpc("yo_ayudo", { p_pedido_id: pedido.data.id });
      assert.equal(ayuda.error, null, mensaje(ayuda.error));
      const admin = await entrarAdmin();
      const bloqueo = await admin.sb.from("bloqueos").insert({
        user_id: ayudante.id,
        motivo: "abuso de prueba",
      });
      assert.equal(bloqueo.error, null, mensaje(bloqueo.error));
      const recibidas = await autora.sb.from("ayudas_recibidas").select("id").eq("pedido_id", pedido.data.id);
      assert.equal(recibidas.data.length, 0);
    },
  );

  test(
    "reclamar_aviso solo con service_role, una vez por tipo",
    { skip: motivoDeSkip(["SUPABASE_SERVICE_ROLE_KEY"]) },
    async () => {
      const alerta = await tres.sb.from("perfiles").update({ alerta_vecinal: true }).eq("id", tres.id);
      assert.equal(alerta.error, null, mensaje(alerta.error));
      const creada = await emergencia(tres.sb, false, "Luz Cabrera");
      assert.equal(creada.error, null, mensaje(creada.error));
      const servicio = clienteServiceRole();

      const inicio = await servicio.rpc("reclamar_aviso", {
        p_emergencia: creada.data.id,
        p_tipo: "inicio",
      });
      assert.equal(inicio.error, null, mensaje(inicio.error));
      assert.equal(inicio.data, true);
      const repetido = await servicio.rpc("reclamar_aviso", {
        p_emergencia: creada.data.id,
        p_tipo: "inicio",
      });
      assert.equal(repetido.data, false);

      const cierrePronto = await servicio.rpc("reclamar_aviso", {
        p_emergencia: creada.data.id,
        p_tipo: "cierre",
      });
      assert.equal(cierrePronto.data, false);
      const invalido = await servicio.rpc("reclamar_aviso", {
        p_emergencia: creada.data.id,
        p_tipo: "raro",
      });
      exigeRechazo(invalido.error, "TIPO_AVISO_INVALIDO");

      const cerrada = await tres.sb.rpc("cerrar_emergencia", { p_emergencia: creada.data.id });
      assert.equal(cerrada.error, null, mensaje(cerrada.error));
      const cierre = await servicio.rpc("reclamar_aviso", {
        p_emergencia: creada.data.id,
        p_tipo: "cierre",
      });
      assert.equal(cierre.data, true);
      const cierreOtra = await servicio.rpc("reclamar_aviso", {
        p_emergencia: creada.data.id,
        p_tipo: "cierre",
      });
      assert.equal(cierreOtra.data, false);

      const practica = await emergencia(tres.sb, true, "Luz Cabrera");
      assert.equal(practica.error, null, mensaje(practica.error));
      const inicioPractica = await servicio.rpc("reclamar_aviso", {
        p_emergencia: practica.data.id,
        p_tipo: "inicio",
      });
      assert.equal(inicioPractica.data, false);
    },
  );
});
