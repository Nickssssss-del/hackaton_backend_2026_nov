# Spec: panel, emergencias, comunidad oculta y bloqueos

**Estado:** aprobada el 2026-11-08.

**Fuentes:** `backend/docs/contrato_modulo2.md` (secciones 1 y 8), las políticas de `07_mockup_v4.sql` y `08_ajustes_backend.sql`, y el panel actual (`panel-web/src`).

## Objetivo

Sumar 3 pestañas al panel del admin, con la misma sesión (Supabase Auth + `es_admin()`), la clave publicable y la misma estructura MVC por capas que ya usan «Servicios ocultos» y «Grupos de apoyo».

## Lo que permite la base (sin cambiarla)

| Tabla | Admin puede | Política |
| --- | --- | --- |
| `emergencias` | leer | `emergencias_leer` |
| `eslabones` | solo leer | `eslabones_leer` |
| `vecinos_que_van` | leer | `vqv_leer` |
| `publicaciones`, `comentarios` | leer, editar `oculto`, borrar | `*_leer`, `*_editar`, `*_borrar`. Al volver a mostrar, la base pone `revisado_en` sola. |
| `reportes_comunidad` | leer y borrar | `reportes_com_*_admin` |
| `bloqueos` | todo | `bloqueos_admin` |
| Storage `fotos` | ver | `fotos_ver_mi_zona` incluye `es_admin()` |

- **Realtime:** el script 07 publica `emergencias`, `eslabones`, `enlaces` y `vecinos_que_van`, y respeta la RLS.
- **Sin nombres de usuarios:** el admin no puede leer perfiles ajenos (`perfiles_leer_propio`). Las personas se muestran con un id corto, por ejemplo «Usuario 3f9a…c21».
- **`creado_por`:** nada lo llena en la base, así que el panel lo envía con el id del admin.

## 1. Emergencias activas (solo lectura)

- **Lee:** `emergencias` con `estado = 'activa'` y `expira_en > now()`, más sus `eslabones` (`orden`, `contacto`, `estado`) ordenados por `orden`, y la cantidad de `vecinos_que_van` con `estado = 'va'`.
- **Muestra por emergencia:**
  - hora de inicio y cuánto falta para que venza;
  - etiquetas «Práctica» y «Avisa a vecinos», con texto y no solo color;
  - la cadena como lista ordenada: «1. Ana: Llamando», «2. Beto: Va en camino»;
  - «N vecinos van».
- **Por privacidad, no muestra** nombre, dirección ni coordenadas, aunque la RLS deje leerlos: la vista no los necesita para seguir la cadena.
- **Tiempo real:**
  - un canal `postgres_changes` sobre `emergencias`, `eslabones` y `vecinos_que_van`;
  - ante cualquier cambio vuelve a leer la lista, con una espera de 300 ms para juntar ráfagas;
  - cada 60 s se recalcula «vence en», y la emergencia vencida sale de la lista aunque nadie haya escrito nada;
  - el canal se cierra al salir de la pestaña.
- **Sin botones que cambien datos.** Solo «Recargar» si falla la lectura.
- **Indicador «En vivo / Sin conexión en vivo»**, con texto, según el estado del canal. Si la suscripción falla, la vista dice «Sin conexión en vivo» y recarga cada 15 s como respaldo.

## 2. Comunidad oculta

Igual que «Servicios ocultos»:

- **Publicaciones con `oculto = true`:**
  - categoría, mensaje, foto si tiene, fecha y autor como id corto;
  - sus `reportes_comunidad`: motivo y fecha. Los anteriores a `revisado_en` llevan la marca «antes de la última revisión».
  - La foto se ve con una URL firmada de 5 minutos (`storage.from("fotos").createSignedUrl`). Hace falta, porque una publicación puede ser solo foto.
- **Comentarios con `oculto = true`:** el texto, dónde está («en una publicación» o «en un negocio») y sus reportes.
- **«Volver a mostrar»:** `update { oculto: false }`. La base pone `revisado_en` sola y los reportes viejos dejan de contar.
- **«Borrar»:** pide confirmación con `window.confirm` y hace `delete`. Los reportes se borran en cascada.
- **«Bloquear al autor»:** abre el mismo formulario de motivo que la pestaña de bloqueos. Si el autor ya está bloqueado, se ve la marca «Autor bloqueado» en vez del botón.
- **Escrituras sin efecto:** cada `update` o `delete` pide las filas afectadas (`exigirFilas`), como hoy. Así, una escritura que no toca filas no se muestra como éxito.

## 3. Bloqueos

- **Lista de `bloqueos`:** usuario (id corto), motivo, fecha y quién bloqueó (id corto, o «tú» si fue la sesión actual). **«Desbloquear»** pide confirmación y hace `delete` por `user_id`.
- **Reportes de personas:** `reportes_comunidad` con `usuario_id`. Muestra motivo, fecha y usuario reportado. Desde cada uno:
  - **«Bloquear»** abre un formulario en la misma tarjeta, con un campo «Motivo» de 1 a 140 caracteres y un contador visible.
  - Al guardar hace `insert { user_id, motivo, creado_por }`.
  - Si ese usuario ya estaba bloqueado (`23505`), avisa «Ya está bloqueado».
  - El reporte no se borra solo; tiene su propio botón **«Descartar reporte»**.
- Un usuario bloqueado se marca «Bloqueado» en sus reportes y no ofrece «Bloquear» otra vez.

## Estructura (la misma de hoy)

```
src/modelos/emergencias.ts          → leer activas con eslabones y conteo; suscribirse a Realtime
src/modelos/comunidadOculta.ts      → leer ocultos con reportes; mostrar, borrar; URL firmada de foto
src/modelos/bloqueos.ts             → leer bloqueos y reportes de personas; bloquear, desbloquear, descartar reporte
src/controladores/useEmergenciasActivas.ts
src/controladores/useComunidadOculta.ts
src/controladores/useBloqueos.ts
src/vistas/EmergenciasActivas.tsx
src/vistas/ComunidadOculta.tsx
src/vistas/Bloqueos.tsx
src/vistas/etiquetas.ts             → + estados de eslabón, categorías de publicación, motivos de reporte, idCorto()
src/vistas/App.tsx                  → 3 pestañas nuevas; la barra pasa a flex-wrap para 5 pestañas
```

- Se reutilizan `Mensajes`, `errores.ts` (`mensajeDeError`), `exigirFilas`, `fecha()` y las mismas clases de Tailwind.
- Sin dependencias nuevas: supabase-js ya trae Realtime y Storage.

## Accesibilidad y estados

- Cada pestaña tiene un `h2` y la barra usa `aria-current`, como hoy.
- Cargando, vacío («No hay emergencias activas», «No hay contenido oculto», «No hay bloqueos») y error con «Recargar».
- El estado del eslabón y el «En vivo» van con texto, no solo con color. Los botones tienen `aria-label` con el elemento al que afectan.
- El formulario de bloqueo tiene `label`, `maxLength={140}`, un contador con `aria-live` y el error asociado al campo.
- Ancho: funciona desde 320 px.

## Comandos

- Revisar tipos y construir: `cd panel-web && npm run build`
- Probar: `cd panel-web && npm run dev`, con una cuenta admin.

## Pruebas

El panel no tiene framework de pruebas. Agregar uno, como Vitest, es una dependencia nueva: ver Preguntas abiertas. Propuesta para esta entrega:

- `npm run build` sin errores;
- revisión manual en el navegador con un admin, con la lista de criterios de abajo.

## Límites

- **Siempre:** sesión del admin y clave publicable; `textContent` (JSX); confirmación antes de borrar o desbloquear; `exigirFilas` en cada escritura.
- **Preguntar antes:** dependencias nuevas; mostrar nombre, dirección o coordenadas de una emergencia.
- **Nunca:** tocar `backend/` ni `app-movil/`; botones que cambien una emergencia, la cadena o los vecinos que van; `service_role`.

## Criterios de éxito

1. Con una emergencia de prueba activa, el panel la muestra con su cadena. Al cambiar un eslabón desde la app, el panel se actualiza solo en unos 2 segundos, sin recargar.
2. Al vencer o cerrarse, la emergencia sale de la lista: en un minuto como máximo, o al instante si llega el evento.
3. «Volver a mostrar» una publicación la quita de la lista, y en la base queda `oculto = false` con `revisado_en` puesto.
4. «Borrar» pide confirmación, borra, y la publicación o el comentario desaparece de la lista.
5. «Bloquear» desde un reporte de persona exige un motivo de 1 a 140 caracteres, crea el bloqueo y el usuario aparece en la lista. «Desbloquear» lo quita.
6. `npm run build` pasa y no hay errores en la consola.
7. En ninguna pestaña aparece nombre, dirección ni coordenadas de una emergencia.

## Decisiones

1. **Práctica:** las emergencias de práctica se muestran con la etiqueta «Práctica». En la demo sirve ver que el panel las registra.
2. **Datos de la emergencia:** no se muestran nombre, dirección ni coordenadas. El panel solo da seguimiento.
3. **Bloquear desde contenido oculto:** sí, con «Bloquear al autor» en la pestaña de comunidad oculta y el mismo formulario de motivo.
4. **Pruebas:** sin dependencias nuevas. Alcanza con `npm run build` y `tsc` limpios, y una revisión manual en el navegador.
5. **Realtime:** se mantiene. Si la suscripción falla, la vista dice «Sin conexión en vivo» y recarga cada 15 s como respaldo.
