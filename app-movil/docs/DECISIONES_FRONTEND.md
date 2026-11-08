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

## D-05 · Categorías de ayuda: «Una manito» se guarda como `transporte` (7-nov-2026, definitiva)

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

## D-10 · Visto bueno con un toque y «Comentar con mi voz» (Fase 5, 8-nov-2026)

- La base exige un motivo en `vistos_buenos`. El **toque en el pulgar** de E3 guarda el motivo `confiable`.
- **«Comentar con mi voz»** guarda un visto bueno **con comentario** (140 letras, sin enlaces) y deja elegir el motivo. «Mis vecinos ven mi comentario» empieza en **Sí** (la persona eligió comentar); en No, el comentario no se muestra.
- Como la base acepta un solo visto bueno por persona y negocio, **hoy se comenta una sola vez**. La tabla propia de comentarios es propuesta del borrador SQL; cuando exista, «Comentar» se separa del visto bueno.
- E3 muestra el comentario destacado de la vista `servicios_publicos` (autor y texto por separado: campo nuevo `comentarioTexto`).
