# Contrato del Módulo 2

Fuente: `07_mockup_v4.sql`, `08_ajustes_backend.sql` y `10_uso_y_comunidad.sql`, alineado con el Informe v2.3. La app entra con la clave publicable. La sesión anónima de la app también usa el rol authenticated; por eso la lectura se limita por zona y por las políticas de cada tabla.

## 1. Tablas nuevas y columnas agregadas

### Columnas en tablas que ya existían

| Dónde | Columna | Para qué |
| --- | --- | --- |
| `perfiles` | `alerta_vecinal` | Interruptor «Vecinos cerca me ven si pido ayuda». En no, la emergencia avisa solo a los contactos y la persona no recibe alertas. Empieza en falso. |
| `servicios` | `foto_path` | Ruta de la foto del negocio. Hasta 300 caracteres. |
| `servicios` | `visible_vecinos` | Interruptor «Mis vecinos pueden verlo». En falso, los vecinos no ven el negocio; el dueño sí. Empieza en verdadero. |
| `pedidos_ayuda.categoria` | valores nuevos `desastre_natural` y `apoyo` | Se suman a arreglos, compras, transporte y salud. «Apoyo» reemplaza a «Compañía». |
| `servicios.oficio` | valores nuevos `menu` y `pago_servicios` | Menú del día, y lugares donde pagar agua y luz. La app no procesa pagos. |
| `publicaciones` | `revisado_en` | La pone el script 08. Marca la revisión del admin: los reportes anteriores dejan de contar. |
| `comentarios` | `revisado_en` | Igual que en publicaciones. |
| `publicaciones` | `lugar` | La pone el script 10. Dirección del evento, opcional, hasta 100 caracteres y sin enlaces. Ver la sección 10. |
| `emergencias` | `avisado_en`, `cierre_avisado_en` | Las escribe solo `reclamar_aviso`, con `service_role`. Sirven para no mandar dos veces el aviso inicial ni el de cierre. |
| `eslabones.contacto` | puede quedar vacío | El nombre del contacto se borra al cerrar la emergencia. |

### `bloqueos`

Sirve para cortar a quien abusa. Columnas: `user_id`, `motivo` (hasta 140), `creado_por`, `creado_en`.

Solo un admin lee y escribe. La app no inserta aquí.

### `push_tokens`

Dirección de notificación de cada celular. Columnas: `id`, `user_id`, `token` (único, de 10 a 300 caracteres), `plataforma` (`android` o `ios`), `creado_en`, `actualizado_en`.

Cada persona solo ve y toca sus filas. Un token es un celular y tiene un solo dueño. La app no hace `insert` directo: usa `registrar_push_token`, que reasigna el token si el mismo celular cambia de cuenta.

### `emergencias`

Datos temporales de quien pide ayuda. Columnas: `id`, `persona`, `estado` (`activa` o `cerrada`), `practica`, `avisar_vecinos`, `nombre`, `direccion`, `lat` y `lng` exactas, `lat_aprox` y `lng_aprox` a 3 decimales, `creado_en`, `expira_en` (2 horas), `cerrada_en`, y las marcas `avisado_en` y `cierre_avisado_en`.

La persona la crea. La leen ella, un admin, y el vecino que confirmó «voy», vio los datos y la emergencia sigue vigente. No hay permiso de actualización para la app: se cierra con `cerrar_emergencia`. Al crear una nueva se cierra la anterior que hubiera quedado abierta. El modo práctica no avisa a vecinos. Hay como máximo 5 emergencias reales por persona en una hora; la práctica no cuenta.

### `eslabones`

Estado de cada llamada de la cadena. El número no se guarda. Columnas: `id`, `emergencia_id`, `orden` (único por emergencia), `contacto` (el nombre, hasta 40), `estado` (`pendiente`, `llamando`, `no_contesto`, `hablamos`, `va_en_camino`), `duracion_s`, `actualizado_en`.

Cascada del Informe v2.3: contactos → posta → 106 → 105 → 116. Ya no incluye al comité vecinal.

- En `eslabones` solo se guardan los contactos y la posta: como máximo 3 (`orden` 1 a 3). Las llamadas al 106, el 105 y el 116 no se guardan.
- La app espera 30 s a cada contacto antes de pasar al siguiente (antes eran 20 s).
- La base todavía acepta `orden` de 1 a 5; el tope de 3 lo pone la app.

Los lee la persona de esa emergencia y un admin. Los crea y actualiza solo la persona, y solo mientras la emergencia siga vigente.

### `enlaces`

Token de la página «Voy en camino» (https://kuna-voy.netlify.app), como máximo dos por emergencia. Columnas: `id`, `emergencia_id`, `eslabon_id`, `contacto`, `token` (lo genera la base; la app no lo elige), `va_en_camino_en`, `creado_en`.

Los crea y lee la persona, porque necesita el token para el SMS. Un admin también los lee. Quien recibe el SMS no tiene cuenta: abre la página con `?t=` y el token, y esa página llama a `enlace_ver` y `enlace_voy`.

### `vecinos_que_van`

Contador de quién va y registro de quién vio la dirección. Columnas: `id`, `emergencia_id`, `vecino_id` (único el par), `estado` (`va` o `ya_no_puede`), `distancia_m`, `vio_datos_en`, `reportado`, `creado_en`, `actualizado_en`.

Leen la persona, el propio vecino y un admin. La app no inserta filas: las escriben `voy_a_ayudar` y `ya_no_puedo_ir`. La persona solo puede marcar `reportado`.

### `publicaciones`

Kermés, misa, ayuda social, donación, taller u otro. Columnas: `id`, `autor`, `zona_id`, `categoria`, `mensaje` (hasta 140), `lugar` (opcional, hasta 100), `foto_path` (hasta 300), `oculto`, `creado_en`, `revisado_en`. Hace falta foto o mensaje.

En la tabla, leen, editan y borran el autor y un admin. Los vecinos leen por la vista `publicaciones_cercanas`. Al crear, la base pone autor, zona y fecha, y rechaza enlaces. Máximo 3 publicaciones por día. Al editar no se pueden cambiar autor, zona ni fecha. Solo un admin cambia `oculto` y `revisado_en`. Si un admin vuelve a mostrar algo oculto, `revisado_en` se pone solo y los reportes anteriores dejan de contar. Un texto editado con enlace da `CON_ENLACE`.

### `asistencias`

El botón «Voy» de una publicación. Columnas: `id`, `publicacion_id`, `vecino_id`, `creado_en`. Una marca por vecino y publicación; se puede retirar.

Cada quien lee y borra la suya. Un admin también. La zona y que la publicación siga visible los valida la base al insertar.

### `comentarios`

En una publicación o en un negocio, nunca en los dos. Columnas: `id`, `autor`, `publicacion_id`, `servicio_id`, `texto` (de 1 a 140, sin enlaces), `oculto`, `creado_en`, `revisado_en`.

En la tabla, leen, editan y borran el autor y un admin. Los vecinos leen por `comentarios_visibles`. Máximo 10 comentarios por día, y solo sobre contenido visible de la propia zona. Al editar no se pueden cambiar autor, destino (publicación o negocio) ni fecha. Solo un admin cambia `oculto` y `revisado_en`. Si un admin vuelve a mostrar algo oculto, `revisado_en` se pone solo y los reportes anteriores dejan de contar. Un texto editado con enlace da `CON_ENLACE`.

### `reportes_comunidad`

Reportes de una publicación, un comentario o una persona. Columnas: `id`, `vecino_id`, `publicacion_id`, `comentario_id`, `usuario_id`, `motivo` (`abuso`, `spam`, `falso`, `ofensivo`, `otro`), `creado_en`. Un reporte apunta a una sola cosa. Un vecino reporta cada destino una vez.

Los lee y borra un admin. El vecino solo inserta el suyo, con perfil completo, hasta 10 por día y dentro de su zona. No se reporta la publicación o el comentario propio. Reportar a una persona solo vale si esa persona ofreció ayuda en un pedido de quien reporta. Tres vecinos distintos, contados desde `revisado_en`, ocultan la publicación o el comentario. Un reporte a una persona no oculta nada: lo revisa el admin.

## 2. Vistas que usa la app

Todas son de lectura, solo para `authenticated`. Sin sesión (ni siquiera anónima) dan error de permiso.

### `servicios_publicos`

Negocios no ocultos de la zona de quien consulta. Si `visible_vecinos` es falso, solo lo ve el dueño. Teléfono y dirección salen solo si el autor dio permiso.

| Columna | Qué es |
| --- | --- |
| `id` | Identificador del negocio |
| `nombre` | Nombre del negocio, o el nombre corto de la persona |
| `nombre_negocio` | Nombre del negocio, si lo hay |
| `oficio` | Oficio |
| `descripcion` | Texto |
| `precio_desde` | Precio desde |
| `hora_apertura`, `hora_cierre` | Horario |
| `abierto_ahora` | Si está abierto |
| `zona_id`, `zona_nombre` | Zona |
| `lat`, `lng` | Coordenadas |
| `direccion` | Solo si `mostrar_direccion` |
| `contacto` | Solo si `mostrar_telefono` |
| `disponible_emergencia` | Disponible en emergencia |
| `visible_vecinos` | Si los vecinos pueden verlo |
| `foto_path` | Ruta de la foto |
| `vistos_buenos_total` | Votos |
| `vistos_buenos_300m` | Votos de vecinos a 300 m o menos |
| `votos_trato_amable`, `votos_buen_precio`, `votos_confiable`, `votos_viene_domicilio` | Conteo por motivo |
| `comentario_destacado` | Último comentario de un visto bueno cuyo autor aceptó mostrarlo |
| `comentario_autor` | Autor de ese comentario |
| `comentario_fecha` | Fecha de ese comentario |
| `es_mio` | Si el negocio es de quien consulta |
| `creado_en` | Fecha |

### `publicaciones_cercanas`

Publicaciones no ocultas de la zona de quien consulta.

| Columna | Qué es |
| --- | --- |
| `id` | Identificador |
| `autor_corto` | Nombre corto del autor |
| `categoria` | Categoría |
| `mensaje` | Texto |
| `foto_path` | Ruta de la foto |
| `zona_id` | Zona |
| `creado_en` | Fecha |
| `minutos_antiguedad` | Minutos desde que se publicó |
| `asistentes` | Cuántos marcaron «Voy» |
| `voy` | Si quien consulta ya marcó «Voy» |
| `comentarios` | Comentarios no ocultos |
| `es_mio` | Si la publicación es de quien consulta |

### `comentarios_visibles`

Comentarios no ocultos de publicaciones o negocios de la zona de quien consulta. No incluye contenido oculto, ni un negocio con `visible_vecinos` en falso.

| Columna | Qué es |
| --- | --- |
| `id` | Identificador |
| `publicacion_id` | Publicación, si el comentario es de una |
| `servicio_id` | Negocio, si el comentario es de uno |
| `autor_corto` | Nombre corto |
| `texto` | Comentario |
| `creado_en` | Fecha |
| `es_mio` | Si el comentario es de quien consulta |

### `ayudas_recibidas`

Solo quien pidió el favor ve a quien se ofreció. Un ayudante bloqueado deja de aparecer.

| Columna | Qué es |
| --- | --- |
| `id` | Identificador de la ayuda |
| `pedido_id` | Pedido |
| `categoria` | Categoría del pedido |
| `ayudante_nombre` | Nombre corto de quien ofreció |
| `ayudante_celular` | Celular de quien ofreció |
| `creado_en` | Fecha |

## 3. Funciones que llama la app o una Edge Function

### `yo_ayudo(p_pedido_id)`

Quién: `authenticated`.

Devuelve: verdadero o falso. Ya no entrega el nombre ni el celular de quien pidió. Quien pidió los ve en `ayudas_recibidas`.

Errores: `PERFIL_INCOMPLETO`, `CELULAR_NO_VERIFICADO`, `BLOQUEADO`, `PEDIDO_NO_DISPONIBLE` (no existe, no está abierto, venció o es propio), `ZONA_DISTINTA`.

### `ver_alerta(p_emergencia, p_lat, p_lng)`

Quién: `authenticated`. Es la vista previa, antes de confirmar: distancia y cuántos van, sin nombre ni dirección.

Devuelve: `activa`, `distancia_m` (redondeada a decenas de metros), `vecinos_en_camino`.

Errores: `PERFIL_INCOMPLETO`, `CELULAR_NO_VERIFICADO`, `EMERGENCIA_TERMINADA` si no hay una emergencia que avise a vecinos y no sea de práctica.

### `voy_a_ayudar(p_emergencia, p_lat, p_lng)`

Quién: `authenticated`. `p_lat` y `p_lng` son la ubicación actual que manda la app.

Devuelve: `datos_revelados`, `nombre`, `direccion`, `lat`, `lng`, `distancia_m`, `vecinos_en_camino`.

Revela nombre, dirección y ubicación, y registra al vecino, solo si se cumple todo: celular verificado, no bloqueado, alerta vecinal activa, domicilio del perfil a 500 m o menos de la ubicación aproximada, y ubicación actual a 1 km o menos. Si no se cumple, `datos_revelados` es falso, nombre, dirección y coordenadas vienen vacíos, y no se escribe en `vecinos_que_van`.

Errores: `PERFIL_INCOMPLETO`, `CELULAR_NO_VERIFICADO`, `BLOQUEADO`, `EMERGENCIA_TERMINADA` (cerrada, vencida, de práctica, que no avisa a vecinos, o es la propia).

### `ya_no_puedo_ir(p_emergencia)`

Quién: `authenticated`.

Devuelve: verdadero si había una fila de ese vecino y pasó a `ya_no_puede`. No declara errores propios.

### `cerrar_emergencia(p_emergencia)`

Quién: `authenticated`. Solo cierra la emergencia de la persona de la sesión.

Devuelve: verdadero si era suya. Borra nombre, dirección y ubicación exacta, y dispara la limpieza de enlaces y nombres de contactos. No declara errores propios.

### `registrar_push_token(p_token, p_plataforma)`

Quién: `authenticated`. `p_plataforma` es opcional y, si no se envía, queda `android`.

Devuelve: verdadero. Si el token ya existía con otra cuenta, pasa a la sesión actual.

Errores: `PERFIL_INCOMPLETO` si no hay sesión o no hay perfil. Si el token mide menos de 10 o más de 300 caracteres, o la plataforma no es android ni ios, la tabla rechaza el dato (error de restricción, sin código propio).

### `registrar_uso(p_segundos)`

Quién: `authenticated`. Guarda el tiempo de uso sin saber quién lo usó. Ver la sección 10.

### `enlace_ver(p_token)`

Quién: `anon` y `authenticated`. La llama la página https://kuna-voy.netlify.app, que no tiene cuenta: un `POST` a `/rest/v1/rpc/enlace_ver` con la clave publicable y `{ p_token }`.

Devuelve: `nombre`, `direccion`, `lat`, `lng`, `va_en_camino`. Solo mientras la emergencia esté activa y sin vencer.

Errores: `EMERGENCIA_TERMINADA`.

### `enlace_voy(p_token)`

Quién: `anon` y `authenticated`.

Devuelve: verdadero. Marca que ese contacto va en camino y, si el enlace tiene eslabón, pone ese eslabón en `va_en_camino`.

Errores: `EMERGENCIA_TERMINADA`.

### Solo `service_role`

| Función | Parámetros | Devuelve |
| --- | --- | --- |
| `vecinos_para_alerta` | `p_emergencia` | `user_id`, `token`, `distancia_m` de quien tiene alerta activa, celular verificado, domicilio a 500 m o menos y no está bloqueado. No incluye la práctica ni una emergencia que no avise a vecinos. |
| `reclamar_aviso` | `p_emergencia`, `p_tipo` (`inicio` o `cierre`) | Verdadero una sola vez. Falso si ese aviso ya se reclamó o no corresponde. |
| `limpiar_emergencias_vencidas` | ninguno | Cuántas emergencias limpió en el primer paso. También la llaman, por dentro, crear y cerrar una emergencia. |

`reclamar_aviso` con un `p_tipo` distinto de `inicio` o `cierre` da `TIPO_AVISO_INVALIDO`.

## 4. Códigos de error

Los que lanzan los scripts 07, 08 y 10, y los que devuelven las funciones. La app los muestra en una frase y no reintenta la misma acción.

| Código | Qué significa | Qué hace la app |
| --- | --- | --- |
| `PERFIL_INCOMPLETO` | No hay sesión, no hay perfil, o faltan nombre, celular o zona. | Pide completar el perfil antes de seguir. |
| `CELULAR_NO_VERIFICADO` | Ofrecer ayuda o ver una alerta exige celular verificado, y no lo está. | Avisa que hace falta verificar el celular y no muestra el contacto de quien pidió. |
| `BLOQUEADO` | La persona está en `bloqueos`. | Dice que la cuenta no puede hacer esa acción. |
| `ZONA_DISTINTA` | El pedido, la publicación, el comentario o el negocio no es de su zona. | Dice que eso es de otra zona y no lo publica. |
| `CON_ENLACE` | El texto trae un enlace. | Pide quitar el enlace y deja el borrador. |
| `LIMITE_DIARIO` | Llegó al tope del día: 3 publicaciones, 10 comentarios o 10 reportes de comunidad. | Dice que ya llegó al límite de hoy. |
| `LIMITE_EMERGENCIAS` | Ya hubo 5 emergencias reales de esa persona en la última hora. La práctica no cuenta. | Dice que debe esperar y no abre otra emergencia real. |
| `PEDIDO_NO_DISPONIBLE` | El pedido no existe, no está abierto, venció o es de quien intenta ayudar. | Quita ese pedido de la lista. |
| `PUBLICACION_NO_DISPONIBLE` | La publicación está oculta, borrada, o es propia y se está reportando. | La saca de la lista o no deja reportarla. |
| `COMENTARIO_NO_DISPONIBLE` | El comentario está oculto, borrado o es propio y se está reportando. | No deja reportarlo. |
| `SERVICIO_NO_DISPONIBLE` | El negocio está oculto o los vecinos no pueden verlo. | No deja comentarlo. |
| `REPORTE_NO_VALIDO` | Se reporta a sí misma, o a alguien que no ofreció ayuda en un pedido suyo. | Dice que ese reporte no corresponde. |
| `EMERGENCIA_TERMINADA` | La emergencia se cerró, venció, es de práctica, no avisa a vecinos, es la propia, o el token ya no sirve. | En la app, cierra la pantalla de la alerta. En la página, se ve «Esta emergencia ya terminó». |
| `MAXIMO_DOS_CONTACTOS` | Esa emergencia ya tiene dos enlaces. | No deja agregar un tercer contacto. |
| `ESLABON_DE_OTRA_EMERGENCIA` | El enlace apunta a un eslabón de otra emergencia. | No guarda ese enlace. |
| `FALTA_CONTACTO` | Un eslabón queda sin nombre. Solo la limpieza puede vaciarlo. | Pide el nombre del contacto. |
| `TIPO_AVISO_INVALIDO` | `reclamar_aviso` recibió un tipo que no es `inicio` ni `cierre`. | `alerta-vecinos` solo manda esos dos tipos. |
| `USO_INVALIDO` | `registrar_uso` recibió menos de 5 o más de 14400 segundos. | No reintenta. No muestra nada a la persona. |
| `SIN_SESION` | `preguntale` o `alerta-vecinos` no recibieron `Authorization: Bearer`. | Vuelve a entrar antes de llamar. |
| `TEXTO_INVALIDO` | El texto de `preguntale` falta, está vacío o pasa de 300 caracteres. | Pide decirlo de nuevo, más corto. |
| `ENTRADA_INVALIDA` | `alerta-vecinos` no recibió un `emergencia_id` válido y un `tipo` `inicio` o `cierre`. | No reenvía el aviso con ese cuerpo. |
| `NO_ES_TUYA` | Quien llama a `alerta-vecinos` no es la persona de esa emergencia. | No muestra el aviso como enviado. |
| `METODO_INVALIDO` | La función recibió algo que no es `POST`. | La app solo usa `POST`. |
| `ERROR_INTERNO` | `alerta-vecinos` falló al comprobar la emergencia, reclamar el aviso o listar vecinos. | Dice que no se pudo avisar y permite intentarlo otra vez. |

## 5. Datos temporales de una emergencia

Al cerrarla, o al vencer las dos horas:

- El estado pasa a `cerrada`.
- Se borran nombre, dirección y ubicación exacta. Quedan `lat_aprox` y `lng_aprox` para avisar el cierre.
- Se borra el nombre de cada contacto de la cadena.
- Se borran los enlaces. https://kuna-voy.netlify.app deja de mostrar esa emergencia.

Al vencer las dos horas, la app deja de poder ver los datos (las funciones y las políticas revisan el vencimiento). El borrado físico ocurre en la siguiente limpieza: al crear o cerrar otra emergencia, o cada 10 minutos si pg_cron está activo.

A los 7 días del cierre se borra la emergencia completa y, con ella, eslabones, `vecinos_que_van` y la ubicación aproximada. Esos 7 días sirven para revisar abusos con el registro de quién vio los datos.

La limpieza corre al crear o cerrar una emergencia. Con `pg_cron`, también cada 10 minutos. Si `pg_cron` no se puede activar, el script avisa y sigue: hay que activar la extensión y volver a ejecutarlo.

## 6. Storage

Bucket privado `fotos`, de hasta 5 MB. Acepta JPEG, PNG y WebP.

Ruta obligatoria: `<zona_id>/<user_id>/<archivo>`.

La ven los vecinos de esa zona y un admin. Cada persona sube solo en su carpeta, con perfil completo, y borra las suyas. Un admin también puede borrar.

## 7. Edge Functions

### `alerta-vecinos`

Responsable: Luana.

`POST`. El cuerpo es `emergencia_id` (uuid) y `tipo` (`inicio` o `cierre`). Hace falta `Authorization: Bearer` de la persona de esa emergencia. Antes de usar `service_role`, lee la emergencia con la clave publicable y el JWT, y solo sigue si `persona` es quien llama. Si no, responde `NO_ES_TUYA`.

Luego llama a `reclamar_aviso` con `service_role`. Si devuelve falso, no envía nada y responde `{ "avisados": 0 }`. Si devuelve verdadero, llama a `vecinos_para_alerta` y manda el push por la API de Expo, en lotes. La salida es `{ "avisados": n }`: cuántos envíos aceptó Expo, no cuántos vecinos había.

El aviso se titula «Kuna». El texto inicial es «Un vecino necesita ayuda a X m», con la distancia redondeada a decenas de metros y nunca menos de 10. Ejemplo: «Un vecino necesita ayuda a 120 m». No lleva nombre ni dirección. El de cierre es «Ya no hace falta, gracias».

El secreto opcional del envío se llama `EXPO_ACCESS_TOKEN`. `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los pone Supabase. `service_role` solo entra a `reclamar_aviso` y `vecinos_para_alerta`.

### `voy-en-camino`

No es una función desplegada. Es la página estática de `backend/web/voy-en-camino/`, publicada en https://kuna-voy.netlify.app. La abre el navegador del contacto, sin cuenta, con `?t=` y el token.

La página hace `POST` a `/rest/v1/rpc/enlace_ver` y `/rest/v1/rpc/enlace_voy` con la clave publicable y `{ p_token }`. No manda sesión. `enlace_ver` pinta el nombre, la dirección y el mapa. `enlace_voy` marca el contacto y, si hay eslabón, lo deja en `va_en_camino`. Si el token no tiene 64 caracteres hexadecimales, o la base responde `EMERGENCIA_TERMINADA`, la página dice «Esta emergencia ya terminó».

### `preguntale`

Responsable del código en `backend/supabase/functions/preguntale/`.

`POST` con `Authorization: Bearer` de la sesión de la app. El cuerpo es `texto` (obligatorio, de 1 a 300 caracteres), y pueden ir `lat`, `lng` y `zona_id`. A la IA solo se le manda el texto: no van nombre, teléfono, pastillas, ubicación ni zona.

`ia.ts` lee `IA_API_KEY`, `IA_MODELO` e `IA_URL` para la IA principal (Groq por defecto) e `IA_RESPALDO_API_KEY`, `IA_RESPALDO_MODELO` e `IA_RESPALDO_URL` para el respaldo (Gemini). Si `IA_MODELO` no está, usa `openai/gpt-oss-20b`.

Devuelve `texto` (hasta 140, sin enlaces), `funcion`, `argumentos`, `confirmar`, y en una búsqueda también `servicios` (hasta 3) y `botones`. Las funciones permitidas son `buscar_servicio`, `crear_recordatorio`, `ver_mi_horario`, `pedir_ayuda`, `llamar` y `como_llegar`. `buscar_servicio` lee `servicios_publicos` con la clave publicable y el JWT de quien pregunta, sin `service_role`. Si la IA no elige una función válida, el texto es «No te entendí. ¿Qué necesitas?». Si la IA falla, «No pude responder ahora. Elige una opción.». Si falta barrio y ubicación, «¿En qué barrio estás?».

## 8. Realtime

El script 07 publica en Realtime las tablas `emergencias`, `eslabones`, `enlaces` y `vecinos_que_van`. La app y el panel las usan para el contador de vecinos que van y para el estado de la cadena. Cada tabla sigue respetando su propia seguridad por filas.

## 9. Lo que la app debe hacer con el token

La app registra el token de push solo con `registrar_push_token`. No hace `insert` ni `update` directo en `push_tokens`. La política por filas no deja tocar el token de otra persona; la función sí lo reasigna cuando el mismo celular entra con otra cuenta.

## 10. Para el equipo de la app: tiempo de uso y lugar del evento

Lo agrega el script `10_uso_y_comunidad.sql` (Informe v2.3).

### `registrar_uso(p_segundos)`

- **Cuándo:** al pasar la app a segundo plano, con los segundos que estuvo en primer plano.
- **No llamarla** si son menos de 5 segundos.
- **Recibe:** `p_segundos`, un entero de 5 a 14400 (4 horas).
- **Devuelve:** nada. Si no hay error, quedó guardado.
- **Error:** `USO_INVALIDO` con menos de 5 o más de 14400. La app no reintenta ni muestra nada.
- **Qué guarda:** zona del perfil (vacía = «Sin zona»), fecha y hora de Lima, y los segundos.
- **Qué no guarda:** quién la usó. La tabla `uso_app` no tiene usuario, nombre ni celular.
- La app no lee `uso_app`: solo un admin. Las filas se borran a los 7 días.

### `publicaciones.lugar`

- **Para qué:** la dirección del evento, por ejemplo «Parque San Isidro».
- **Opcional:** se puede dejar vacío.
- **Hasta 100 caracteres.** Si pasa, la tabla rechaza el dato (error de restricción, sin código propio).
- **Sin enlaces:** con un enlace, al crear o al editar, da `CON_ENLACE`. La app pide quitarlo y deja el borrador.
