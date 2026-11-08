# Decisiones del frontend (Mockup v4)

Registro de decisiones del equipo que cambian o completan el Mockup v4. Fuente visual: *Vecinos · Mockup v4 (ordenado por flujos)*.

## D-01 · Letra: 20 / 23 / 26 px (7-nov-2026)

Normal 20 px, Grande 23 px y Enorme 26 px. Nunca baja de 20 px. El botón **Aa** pasa de Normal a Grande a Enorme y vuelve a Normal. Se guarda en el teléfono (`barrio.preferencias`). Implementado en `src/vistas/tema/tokens.ts` y `src/vistas/componentes/Texto.tsx`.

## D-02 · Modo oscuro persistente e independiente de la letra (7-nov-2026)

Fondo `#121417` y texto `#F4F4F4`, según la matriz. Rojo, verde y azul se mantienen en los botones. Se guarda en el teléfono.

## D-03 · Celular solo cuando hace falta (7-nov-2026)

El registro mantiene 3 pasos y **no** pide celular. La base exige celular (`perfil_completo()`) para publicar, pedir ayuda y dar visto bueno. Por eso, al hacer una de esas acciones, la app mostrará una pantalla simple: «Para que te puedan contactar, ¿cuál es tu celular?». **Pendiente:** se construye con los módulos E y F. La base no cambia.

## D-04 · Emergencia asistida, no automática (7-nov-2026)

En la primera versión con Expo:

- Se mantienen las pantallas y los tiempos del Mockup v4: G1 «¿Estás bien?» con 5 minutos, G2 «Pidiendo ayuda» y G3 «Alerta vecinal».
- Si la persona no responde, se muestra el estado de emergencia y se activan **solo** las acciones que la app y el backend soportan de verdad.
- Hay botones grandes para **llamar** a cada contacto y para **abrir el SMS** con el mensaje y la ubicación ya escritos.
- Android exige que la persona confirme la llamada (marcador) y el envío del SMS. **La app nunca muestra «enviado» ni «llamada hecha» si la persona no lo confirmó.**
- Sin conexión, se muestra un estado claro y se conservan las alternativas del teléfono: SMS, llamada y punto seguro local.
- La alerta a vecinos cercanos solo existirá si el backend la soporta. Hoy no la soporta: la regla 1 de `backend/AGENTS.md` excluye Realtime. G3 se mostrará con datos de demostración marcados como tales.

**Mejora futura (no incluida):** llamada y SMS 100 % automáticos. Requieren salir del Expo gestionado e integrar módulos nativos de Android con los permisos `CALL_PHONE` y `SEND_SMS`. Google Play restringe esos permisos a apps cuya función principal sea la telefonía o los SMS. Además, Android no informa de forma fiable si una llamada fue contestada (INC-14 y INC-15 del informe).

La emergencia anterior (`app/emergencia/**`) sigue intacta hasta que la nueva esté probada en un teléfono.

## D-05 · Categorías de ayuda: «Una manito» se guarda como `transporte` (7-nov-2026, definitiva; confirmada el 8-nov)

| Tarjeta en F1 | Valor en `pedidos_ayuda.categoria` | ¿Existe en la base? |
|---|---|---|
| Desastre natural (sismo o lluvia) | `desastre_natural` | No: propuesto en el borrador SQL |
| Salud | `salud` | Sí |
| Compras | `compras` | Sí |
| **Una manito** (antes «Compañía» en el mockup; se llamó «Apoyo» en una versión intermedia) | `transporte` | Sí |

- **No** se crea ningún valor `apoyo`. Una primera versión del borrador SQL lo proponía y se corrigió.
- Los textos y valores se centralizan en `src/modelos/categoriasAyuda.ts`. `disponibleEnBase: false` indica que `desastre_natural` aún no debe enviarse.
- No había ningún texto «Compañía» en el código, así que no hizo falta ningún reemplazo.

## D-06 · Registro v4: qué sale del teléfono (Fase 2)

| Dato | Dónde queda |
|---|---|
| Modo (sencillo o completo), letra, oscuro, «Avisarles cuando salgo de casa» | Solo en el teléfono |
| Nombre, edad, género (A4) | Solo en el teléfono. Sin DNI |
| Dirección: calle, número y referencia (A3.1) | Solo en el teléfono |
| Contactos, hasta 2 (A5) | Solo en el teléfono |
| Coordenadas del domicilio (A3) | En el teléfono con precisión completa. A la nube **redondeadas a 3 decimales**, junto con la zona, solo si están dentro de una zona registrada y hay internet |

## D-07 · Registro v4: reglas de validación (Fase 2)

- **A3.1:** los tres campos son obligatorios para «Seguir», porque el mockup muestra «Falta 1 dato» con la referencia vacía (INC-04). «Omitir» siempre está disponible.
- **A4:** nombre de 2 a 60 caracteres. Edad de 18 a 110, empieza en 70. «Eres» es opcional.
- **A5:** máximo 2 personas. Celular de 9 dígitos que empieza en 9; se aceptan espacios, guiones y el prefijo +51. «Listo» funciona con 0 personas, como en el mockup (INC-06).
- **«Avisarles cuando salgo de casa»** empieza en **No** (el mockup lo dibuja en Sí): requiere consentimiento (INC-07). Hoy solo se guarda la elección; el aviso con GPS en segundo plano no está construido.
- **Modo sencillo:** si la letra está en Normal, pasa a Grande, porque la tarjeta promete «Letra grande».

## D-08 · Agenda de contactos: API `legacy` (Fase 2)

En `expo-contacts` 58, `getContactsAsync` importado desde `"expo-contacts"` **lanza un error al ejecutarse**: está obsoleto. El registro nuevo usa `expo-contacts/legacy`. Las pantallas anteriores `app/registro/contactos.tsx` y `app/mis-datos/contactos.tsx` todavía lo importan de la forma obsoleta, así que su agenda falla. **Mis datos → Contactos** sigue usando esa pantalla vieja: se corrige en la Fase 3.

## D-09 · Servicios v4: categorías, «Sube tu negocio» y foto (Fase 5, 8-nov-2026)

Pantallas nuevas en `app/servicios/`: E1 `index` («¿Qué buscas?»), E2 `lista`, E3 `[id]` (detalle), `[id]/comentar`, `[id]/reportar`, E4 `publicar` y `mios` (Mis servicios). Inicio (B1/B2) y Más opciones ya apuntan aquí. Las pantallas anteriores (`buscar`, `servicio/`, `publicar/`, `mis-servicios`) siguen en el código sin enlaces nuevos, hasta que se aprueben retirarlas.

- **Categorías sin cambiar la base** (`src/modelos/categoriasServicio.ts`). Cada tarjeta de E1 agrupa oficios que ya existen en `servicios.oficio`:

  | Tarjeta E1 | Oficios |
  |---|---|
  | Agua y luz | `gasfitero`, `electricista` |
  | Menú del día | `restaurante`, `cafeteria` |
  | Bodegas | `bodega`, `mercado` |
  | Panaderías | `panaderia` |
  | Farmacias | `farmacia` |
  | Oficios | todos los demás |

- **«Decir qué busco»**: lo dicho se lleva a una categoría por palabras clave («pan» → Panaderías); si no se reconoce, se busca por texto. Sin micrófono aparece un campo para escribir.
- **«Cerca de ti»**: negocios a 30 min a pie o menos, del más cercano al más lejano. Sin ubicación guardada se pide marcar la dirección.
- **Abierto / Cerrado** solo se muestra si el negocio tiene horario; si no lo tiene, no se inventa.
- **E4 tipos**: Bodega, Panadería, Gasfitero, Menú (`restaurante`), Farmacia y **Otro**, que abre la lista completa de oficios.
- **«Mis vecinos pueden verlo»** empieza en **No** y es el consentimiento: al publicar se muestran el nombre y el **celular del perfil** (`mostrar_telefono = true`), para que funcione «Llamar». Sin aceptar, Publicar dice «Falta aceptar». La dirección no se publica; la ubicación va redondeada a 3 decimales (como antes).
- **Agregar foto**: todavía no hay dónde guardarla (Storage es propuesta del borrador SQL) ni librería de cámara instalada. El botón avisa «Las fotos llegan pronto» y E3 muestra el ícono del tipo de negocio sobre su color. **Pendiente:** `expo-image-picker` + Storage, con aprobación (cambio nativo).
- **Celular solo al escribir** (D-03): publicar, visto bueno, comentar y reportar llevan a `/perfil/celular` si falta, y al volver se envía solo (salvo reportar, que se vuelve a tocar).

## D-10 · Visto bueno con un toque y «Comentar con mi voz» (Fase 5, 8-nov-2026) — **la parte de comentarios la reemplaza D-14**

- La base exige un motivo en `vistos_buenos`. El **toque en el pulgar** de E3 guarda el motivo `confiable`.
- **«Comentar con mi voz»** guarda un visto bueno **con comentario** (140 letras, sin enlaces) y deja elegir el motivo. «Mis vecinos ven mi comentario» empieza en **Sí** (la persona eligió comentar); en No, el comentario no se muestra.
- Como la base acepta un solo visto bueno por persona y negocio, **hoy se comenta una sola vez**. La tabla propia de comentarios es propuesta del borrador SQL; cuando exista, «Comentar» se separa del visto bueno.
- E3 muestra el comentario destacado de la vista `servicios_publicos` (autor y texto por separado: campo nuevo `comentarioTexto`).

## Alineación con el backend de `main` (scripts 07–09 y Edge Functions, 8-nov-2026)

Requisito: el proyecto de Supabase debe tener aplicados los scripts `07_mockup_v4.sql` y `08_ajustes_backend.sql`, y desplegadas las Edge Functions `preguntale` y `alerta-vecinos`. Fuente: `backend/docs/contrato_modulo2.md`.

## D-11 · Categorías de ayuda alineadas con el script 07

«Una manito» se mantiene: en pantalla dice «Una manito» y se guarda como `transporte` (D-05). No se usa `apoyo`, aunque el script 07 lo acepte; un pedido antiguo con `apoyo` también se muestra como «Una manito». «Desastre natural» se envía como `desastre_natural`, que ya existe. Las 4 tarjetas de F1 se pueden enviar.

## D-12 · «Quiero ayudar» con el contrato nuevo de `yo_ayudo`

`yo_ayudo` devuelve `true` y exige celular verificado. La app ya no muestra el número de quien pidió: es quien pidió quien ve al ayudante en **Mis pedidos** (`/ayuda-vecinos/mis-pedidos`, vista `ayudas_recibidas`) y llama. Con `CELULAR_NO_VERIFICADO`, F1 lleva a confirmar el celular.

## D-13 · Confirmar el celular por SMS (`/perfil/verificar`)

`updateUser({ phone })` sobre la cuenta anónima → código de 6 números → `verifyOtp({ type: "phone_change" })` → `sincronizar_verificacion()`. Lo exigen ofrecer ayuda y la alerta vecinal. Requiere Supabase Auth con teléfono y Twilio (`backend/docs/configuracion.md`). Mis datos muestra «Confirmar mi celular» o «Celular confirmado».

## D-14 · Comentarios de negocios en la tabla `comentarios`

«Comentar con mi voz» (E3) escribe en `comentarios` y E3 lee `comentarios_visibles`. Se puede comentar más de una vez. El visto bueno sigue siendo un toque.

## D-15 · E4 con horario, precio, descripción y `visible_vecinos`

Se rescatan del formulario anterior (`app/publicar/*`) el horario (abre y cierra, cada 30 min), el precio desde y la descripción. «Mis vecinos pueden verlo» es `servicios.visible_vecinos`: en No, el negocio se guarda pero solo lo ve su dueño. «Menú» se guarda como `menu`, y «Agua y luz» incluye `pago_servicios`. La foto se **muestra** si existe en el bucket `fotos`; **subirla** sigue pendiente (necesita `expo-image-picker`, cambio nativo con aprobación).

## D-16 · D1 «Pregúntale a Vecinos» y F2/F3 «Comunidad»

- D1 (`/preguntale`) llama a la Edge Function `preguntale`. Pide consentimiento la primera vez. Lo que crea algo se confirma con «¿Lo guardo?». «Llamar» nunca marca sin un toque.
- F2/F3 (`/comunidad`) usan `publicaciones_cercanas`, `publicaciones`, `asistencias` («Voy»), `comentarios` y `reportes_comunidad`.

## D-17 · Emergencia registrada en la base, push y alerta vecinal real

- G2 registra, en segundo plano y con tiempo máximo, `emergencias`, `eslabones` (estado de cada llamada) y un enlace «Voy en camino» que va dentro del SMS. Avisa con `alerta-vecinos` (inicio y cierre) y muestra en vivo (Realtime) quién confirmó que viene. «Estoy bien, cancelar» llama a `cerrar_emergencia`. **Nada de esto frena las llamadas ni el SMS.**
- «Vecinos cerca me ven si pido ayuda» se guarda en `perfiles.alerta_vecinal` y registra el token de push (`registrar_push_token`).
- Al tocar el aviso push se abre G3 real (`/sos/alerta`): `ver_alerta`, `voy_a_ayudar` y `ya_no_puedo_ir`. La demo sigue en `/sos/vecino`.
- Para que lleguen los push hace falta un development build con `extra.eas.projectId` en `app.json` (`eas init`) y FCM (`google-services.json`, ya en `main`). La carpeta `android/` está versionada: hay que regenerarla (`npx expo prebuild`) para que tome `googleServicesFile` y los plugins.
- El botón rojo de F1 ahora lleva a `/sos` (antes iba a la emergencia anterior, `/emergencia`).

## D-18 · Subir fotos (E4 y F3)

Con `expo-image-picker` (~58.0.10): «Tomar foto» o «Mis fotos», recorte 4:3 y calidad 0,5. Se sube al bucket `fotos` en `<zona>/<usuario>/<archivo>` después de sincronizar el perfil (la política `fotos_subir` exige perfil completo). En E4, si la foto falla, el negocio se publica igual y se avisa. En F3 basta foto o mensaje. Es un cambio nativo: hay que reinstalar el development build.

## D-19 · «Avisar si salgo de casa» con geocerca

Al activar el interruptor (A5 o B3) se pide la ubicación «Todo el tiempo» y se crea una geocerca de 150 m alrededor de la casa (`expo-location` + `expo-task-manager` ~58.0.13). Al salir llega una notificación local, como máximo una cada 30 min; al tocarla, `/salida` abre Mensajes para las personas de confianza con la hora y la ubicación. La persona toca Enviar. Nada sale del teléfono hacia Supabase. Requiere `ACCESS_BACKGROUND_LOCATION` (`isAndroidBackgroundLocationEnabled` en `app.json`); Google Play revisa este permiso si algún día se publica allí.

## D-20 · Emergencia por caída (Mockup v4, p. 26)

`expo-sensors` (~58.0.4). Con la app abierta, el acelerómetro busca caída libre (< 0,4 g por 80 ms o más), golpe (> 2,5 g antes de 1,5 s) y quietud (2 s cerca de 1 g). Si se cumplen las tres, abre G1 (`/sos?caida=1`) con «Parece que te caíste». Está activado por defecto y se apaga en Mis datos › «Detectar caídas». No corre durante el registro ni dentro de la emergencia, y espera 1 minuto entre detecciones. Con la app cerrada no funciona: haría falta un servicio en primer plano. La lógica está en `src/modelos/detectorCaida.ts` (probada con series simuladas).

## D-21 · Elegir el barrio de la lista (tabla `zonas`)

A3.2 `/alta/zona` («¿Cuál es tu barrio?») muestra las zonas de la base y marca «Estás aquí» si la ubicación cae en una. Aparece en el registro cuando el GPS no dejó zona, y desde Mis datos › Mi barrio. Si las coordenadas no caen en la zona elegida, a la nube va solo la zona (`validar_zona_perfil`). Servicios, Comunidad y Ayuda muestran «Elegir mi barrio» si falta.

## D-22 · Mapa de OpenStreetMap en la alerta vecinal (G3)

`MapaOSM` dibuja teselas de `tile.openstreetmap.org`, con User-Agent propio y la atribución «© OpenStreetMap», sin librería nativa ni clave. Antes de «Voy a ayudar», `ver_alerta` no entrega la ubicación: se ve tu punto y un anillo a la distancia aproximada. Después, `voy_a_ayudar` revela la ubicación: tu punto, el de la persona (late) y el camino punteado, además de la dirección. Sin internet se usa el mapa dibujado.

## D-23 · Fidelidad al Mockup v4

- D1 es un chat: burbujas con historial (las últimas 6), botones dentro de la respuesta y, abajo, teclado y «Toca y habla», que envía al terminar de hablar. La confirmación del recordatorio usa el texto del mockup.
- F3 sigue el orden del mockup: foto (recuadro punteado), «¿Qué quieres contar?», «¿De qué se trata?», y en el botón «Falta foto o mensaje y la categoría».
- E4: «Mis vecinos pueden verlo» empieza en No y Publicar dice «Falta aceptar», como en el mockup. Al editar, ponerlo en No oculta el negocio (`visible_vecinos`). Reemplaza la parte de D-15 que lo hacía opcional al publicar.
- G2: la franja verde dice quién puede ver dónde estás con datos reales, por ejemplo «Ana, Jorge y 3 vecinos pueden ver dónde estás».
