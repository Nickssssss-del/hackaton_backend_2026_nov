# Propuesta SQL: categorías, Comunidad y moderación (borrador)

**Archivo:** `docs/propuestas/sql_comunidad_vecinos_borrador.sql`
**Estado:** borrador para revisión. **No se ha ejecutado** en ningún proyecto de Supabase. Ninguna tabla, vista ni función de este archivo existe todavía.
**Para:** responsable del backend.
**Fecha:** 7 de noviembre de 2026. **Versión 2:** se quitó la categoría `apoyo`; se incluyeron «Agua y luz» y los reportes de publicaciones.

## Por qué existe

El Mockup v4 incluye cosas que el esquema actual no soporta:

1. **F1 · Ayuda entre vecinos** usa las categorías *Desastre natural*, *Salud*, *Compras* y *Una manito*. Hoy `pedidos_ayuda.categoria` solo acepta `arreglos`, `compras`, `transporte` y `salud`.
2. **F2 / F3 · Comunidad**: los vecinos publican un mensaje con categoría (Kermés, Misa, Donación, Ayuda social, Taller, Otro) y otros tocan «Voy». No hay tabla para esto.
3. **E1 · Servicios** muestra «Agua y luz», que no existe como oficio.

El equipo decidió (7-nov): aprobar solo cambios pequeños para la demo, publicaciones **solo con texto** en esta primera versión y **sin** Realtime ni chatbot.

## Qué revisé antes de escribirlo

- `01_tablas.sql`: claves `uuid` con `gen_random_uuid()`, autor `default auth.uid()` que referencia `perfiles(id) on delete cascade`, zona en `zonas(id)`, categorías con `check (… in (…))`, textos de 140 caracteres como máximo.
- `02_funciones.sql`: validaciones en triggers `security definer` con `search_path = ''`, códigos de rechazo fijos, vistas `security definer` comentadas (`pedidos_cercanos` como modelo), ocultado automático por reportes (`ocultar_por_reportes`).
- `03_politicas.sql`: RLS en todas las tablas, lectura propia o admin, inserción propia con `perfil_completo()`, `anon` sin escritura.
- `backend/AGENTS.md`: reglas 1 a 12.

No duplica tablas ni columnas existentes, y no modifica funciones ya probadas por `backend/pruebas/rls.test.mjs`.

## Cambios, uno por uno

| Sección | Cambio | Detalle |
|---|---|---|
| 1 | `pedidos_ayuda`: **una** categoría nueva | Se rehace `pedidos_ayuda_categoria_check` con los 4 valores actuales **más** `desastre_natural`. «Una manito» usa `transporte`, que ya existe: **no** se crea `apoyo`. |
| 2 | Tabla nueva `publicaciones` | `id`, `autor`, `zona_id`, `categoria` (`kermes`, `misa`, `donacion`, `ayuda_social`, `taller`, `otro`), `mensaje` (1 a 140 caracteres), `oculto`, `creado_en`. Hay una columna de foto comentada para la fase de fotos. |
| 3 | Tabla nueva `asistencias` (botón «Voy») | Una marca por vecino y publicación (`unique`), que se puede retirar. |
| 4 | Triggers y vista | `validar_publicacion()` exige perfil completo, rechaza enlaces (`CON_ENLACE`), limita a 3 por día (`LIMITE_DIARIO`) y fija autor, zona y fecha. `proteger_publicacion()` hace que solo el admin pueda ocultar. `validar_asistencia()` exige misma zona (`ZONA_DISTINTA`) y publicación visible (`PUBLICACION_NO_DISPONIBLE`, código **nuevo**). La vista `publicaciones_cercanas` muestra solo la zona de quien consulta, con nombre corto, número de asistentes, si yo voy y si es mío. |
| 5 | RLS y permisos | Lectura propia o admin, inserción propia con perfil completo, **borrado propio** o admin, **edición solo admin**, `anon` sin escritura ni lectura de la vista. |
| 6 | Oficio nuevo `pago_servicios` | Para «Agua y luz» (E1). Se rehace `servicios_oficio_check` con los 23 oficios actuales más el nuevo. |
| 7 | Tabla nueva `reportes_publicaciones` | Mismo patrón que `reportes`: mismos motivos, uno por vecino y publicación, 5 por día. Con **3 vecinos distintos** la publicación se oculta sola (`ocultar_publicacion_por_reportes()`) y el admin la revisa. Es una tabla propia, para no cambiar `reportes`, que el panel ya usa. |
| 8 | Verificaciones | Consultas para comprobar RLS, la categoría nueva (y que `apoyo` se rechaza), la vista sin sesión, los rechazos, el ocultado por reportes y el oficio nuevo. |

## Valores internos y nombre en pantalla

| Valor en la base | Texto en la app |
|---|---|
| `desastre_natural` *(nuevo)* | Desastre natural (sismo o lluvia) |
| `salud` | Salud |
| `compras` | Compras |
| `transporte` | **Una manito** *(antes «Compañía» en el mockup)* |
| `arreglos` | Se conserva por compatibilidad; el Mockup v4 ya no lo muestra |
| `pago_servicios` *(nuevo, servicios)* | Agua y luz |

## Recomendaciones del equipo frontend (7-nov)

| Pregunta | Recomendación | Cómo queda en el borrador |
|---|---|---|
| 1. ¿3 publicaciones por día? | Sí, evita el spam. | Incluido (sección 4). |
| 2. ¿Incluir «Voy»? | Sí, es sencillo y le da vida a la comunidad. | Incluido (sección 3). |
| 3. ¿Borrar sí, editar no? | Sí. | Incluido (sección 5). |
| 4. ¿«Agua y luz» como servicio? | Sí: está en el mockup y la pidió el docente. | Incluido (sección 6). |
| 5. ¿Reportar publicaciones? | Sí: una comunidad necesita moderación, y el panel web ya modera. | Incluido (sección 7). |
| 6. Código de error nuevo `PUBLICACION_NO_DISPONIBLE` | De acuerdo. | Incluido. |
| 7. Pasarlo a `07_comunidad.sql` con pruebas nuevas | De acuerdo. | Pendiente de tu revisión. |

La decisión final es tuya: cada sección se puede quitar sin afectar a las demás, salvo la 3 y la 7, que dependen de la tabla de la 2.

## Dependencias

- Requiere los scripts `01`, `02` y `03` ya ejecutados.
- Si se aprueba, se propone guardarlo como `backend/database/07_comunidad.sql`. No cambia el orden 01–05 (regla 10).
- `borrar_mis_datos()` no necesita cambios: borrar el perfil elimina en cascada publicaciones, asistencias y reportes.
- **En la app** hará falta:
  - traducir `PUBLICACION_NO_DISPONIBLE`;
  - tratar el error `23505` en «Voy» como «ya marcaste que vas» y en reportes como «ya reportaste»;
  - añadir `pago_servicios` a la lista de oficios;
  - leer solo `publicaciones_cercanas`.
- **En el panel web:** listar `reportes_publicaciones` y las publicaciones ocultas para revisarlas.

## Cómo revisarlo

1. Leer el archivo completo. Todo está en una transacción (`begin … commit`).
2. Confirmar los nombres reales de las restricciones `pedidos_ayuda_categoria_check` y `servicios_oficio_check` con las consultas de las secciones 1 y 6.
3. Ejecutarlo primero en el **proyecto de desarrollo**, nunca directamente en el de la demo.
4. Correr las verificaciones de la sección 8 y `npm test` en `backend/pruebas`.
5. Si todo pasa, moverlo a `backend/database/07_comunidad.sql`, añadir pruebas RLS (casos 21 en adelante) y avisar al equipo frontend.

## Comprobación que hizo el equipo frontend

- Sintaxis revisada con un analizador de PostgreSQL (`pglast`): 69 sentencias y 5 funciones PL/pgSQL sin errores.
- **No** se ejecutó en ninguna base de datos.
