# Spec: Edge Function `preguntale`

**Estado:** aprobada el 2026-11-07. **Fuente:** Informe definitivo v2, secciones 16 y 21, y la decisión 20 del anexo.

## Objetivo

Interpretar lo que la vecina dice o escribe en «Pregúntale a Vecinos» y devolver **una sola** de 6 acciones permitidas, con un texto corto que la app lee en voz alta. La función interpreta y busca servicios. Todo lo demás lo ejecuta la app en el celular, que es donde viven los contactos y las pastillas.

## Qué recibe

`POST /functions/v1/preguntale`, con la sesión de Supabase de la app (anónima o no) en `Authorization: Bearer <jwt>`.

```json
{ "texto": "busca un gasfitero abierto", "lat": -14.068, "lng": -75.728, "zona_id": "11111111-0000-4000-8000-000000000001" }
```

| Campo | Regla |
| --- | --- |
| `texto` | Obligatorio, de 1 a 300 caracteres. Es lo único que llega a la IA. |
| `lat`, `lng` | Opcionales. La función los redondea a 3 decimales; solo sirven para ordenar servicios por cercanía y **no se envían a la IA**. |
| `zona_id` | Opcional, uuid de la zona del perfil. Si no llega ubicación, `buscar_servicio` filtra por esta zona. **No se envía a la IA.** Si llega inválido, se ignora. |

No recibe nombre, teléfono, contactos ni pastillas.

## Qué devuelve

Siempre `200` con esta forma, salvo los errores de la tabla de abajo.

```json
{
  "texto": "Encontré 2 gasfiteros abiertos cerca.",
  "funcion": "buscar_servicio",
  "argumentos": { "oficio": "gasfitero", "abierto_ahora": true },
  "confirmar": false,
  "servicios": [ { "id": "…", "nombre": "…", "oficio": "gasfitero", "abierto_ahora": true, "vistos_buenos_total": 4, "contacto": null, "lat": -14.07, "lng": -75.73 } ],
  "botones": [ { "etiqueta": "Llamar", "funcion": "llamar", "argumentos": { "servicio_id": "…" } } ]
}
```

- `texto`: máximo 140 caracteres y sin enlaces. La app lo lee con `expo-speech`.
- `funcion`: una de las 6, o `null` cuando no entiende.
- `confirmar`: `true` en todo lo que crea algo. La app pregunta «¿Lo guardo?» antes de ejecutar.
- `servicios`: solo en `buscar_servicio`.

## Las 6 funciones permitidas

| Función | Argumentos que devuelve la IA | Quién la ejecuta | `confirmar` |
| --- | --- | --- | --- |
| `buscar_servicio` | `oficio` (de la lista cerrada de `servicios.oficio`), `abierto_ahora` (opcional) | **La función**: lee `servicios_publicos` y devuelve hasta 3. Con ubicación, los más cercanos; sin ubicación, los de `zona_id` con más vistos buenos; sin ninguna de las dos, no busca y pregunta «¿En qué barrio estás?» | no |
| `crear_recordatorio` | `que` (texto ≤60), `hora` (`HH:MM`), `repetir` (`diario` o `una_vez`) | La app, con notificaciones locales | **sí** |
| `ver_mi_horario` | ninguno | La app, con los datos del celular | no |
| `pedir_ayuda` | `categoria` (`arreglos`, `compras`, `transporte` o `salud`), `descripcion` (≤140, sin enlaces) | La app, con un `insert` en `pedidos_ayuda` | **sí** |
| `llamar` | `a_quien` (texto, por ejemplo «mi hija») o `servicio_id` | La app busca el contacto en el celular y muestra el botón. **Nunca marca sin un toque.** | no |
| `como_llegar` | `servicio_id` o `destino` (texto) | La app abre Google Maps | no |

La IA solo ve estas 6 herramientas. Antes de responder, la función valida el nombre y los argumentos contra esta tabla. Si la IA pide otra función o manda argumentos inválidos, se trata como «no entiende».

## Sin internet y cuando no entiende

- **Sin internet:** la app no llama a la función. Muestra «Necesito internet» y los botones de siempre: Servicios, Pastillas y Ayuda. Así es como lo describe la sección 16 del informe.
- **No entiende:** la función responde `200` con `funcion: null`, `texto: "No te entendí. ¿Qué necesitas?"` y los botones Servicios, Pastillas y Ayuda.
- **La IA falla:** si la principal lanza error (HTTP no OK, más de 5 s o red) y hay respaldo configurado, se reintenta una vez con el respaldo (tope de 8 s). Si no hay respaldo, o el respaldo también falla, se responde lo mismo que en «no entiende», con `texto: "No pude responder ahora. Elige una opción."`. Si la principal responde bien pero no elige herramienta, eso es «no entiende» y **no** se usa el respaldo.
- **`buscar_servicio` sin ubicación ni `zona_id`:** la misma forma, con `texto: "¿En qué barrio estás?"` y los botones de siempre, sin buscar.
- **`buscar_servicio` sin resultados:** `servicios: []`, `texto: "No encontré … en tu barrio."` y los botones de siempre (Servicios, Pastillas y Ayuda), para que la persona no quede sin salida.

| Código HTTP | `error` | Cuándo |
| --- | --- | --- |
| 400 | `TEXTO_INVALIDO` | Falta `texto`, está vacío o pasa de 300 caracteres. |
| 401 | `SIN_SESION` | No llega un JWT válido. Supabase lo rechaza antes de entrar a la función. |
| 405 | `METODO_INVALIDO` | Cualquier método que no sea `POST`. |

## Datos y privacidad

- La función **solo lee la vista `servicios_publicos`**. No lee tablas, no escribe nada y no guarda historial.
- Crea el cliente de Supabase con la clave publicable y el JWT de quien llama, así que se aplican RLS y las mismas reglas que en la app. **No usa `service_role`.**
- No escribe en los logs el texto, la ubicación ni la zona de quien pregunta, solo el tipo de error.
- El consentimiento lo pide la app la primera vez, antes de llamar a la función.

## Clave de la IA

Es un secreto de Supabase. Nunca va en el código, en `.env` versionados ni en la APK.

```bash
npx supabase secrets set IA_API_KEY=... IA_MODELO=openai/gpt-oss-20b
```

La IA es cualquier API **compatible con OpenAI**, llamada con `fetch` y sin SDK. Por defecto es **Groq**:

- `IA_URL`: opcional. Por defecto `https://api.groq.com/openai/v1/chat/completions`.
- `IA_API_KEY`: la clave del proveedor. Se envía como `Authorization: Bearer`.
- `IA_MODELO`: opcional. Por defecto `openai/gpt-oss-20b`.

Cambiar de modelo o de proveedor es cambiar estos secretos, sin tocar código ni sacar una APK nueva.

**IA de respaldo (opcional).** Se configura con 3 secretos más, todos obligatorios y sin valores por defecto. Si falta alguno, no hay respaldo.

- `IA_RESPALDO_API_KEY`: la clave del proveedor de respaldo.
- `IA_RESPALDO_MODELO`: el modelo.
- `IA_RESPALDO_URL`: el endpoint compatible con OpenAI, por ejemplo el de Gemini de la sección siguiente.

El respaldo se usa una sola vez y solo si la principal lanza error. La principal tiene 5 s y el respaldo 8 s, así que la respuesta no pasa de unos 13 s. En ese caso el log registra solo `IA principal falló: <código>, usando respaldo`, por ejemplo `IA_HTTP_429` o `TimeoutError`, sin el texto, la ubicación ni las claves.

## Cambiar de proveedor

Para pasar a **Gemini** por su endpoint compatible con OpenAI:

```bash
npx supabase secrets set IA_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions IA_API_KEY=<clave de Gemini> IA_MODELO=gemini-3.8-flash
```

Confirmado en la documentación oficial de Google: https://aistudio.google.com/docs/openai. Es la ruta a la que redirige `ai.google.dev/gemini-api/docs/openai`; la consulté el 2026-11-08.

- **URL base:** `https://generativelanguage.googleapis.com/v1beta/openai/`. El ejemplo REST de chat usa `…/v1beta/openai/chat/completions`.
- **Clave:** se envía como `Authorization: Bearer $GEMINI_API_KEY`, igual que hace `llamarIA()`.
- **Funciones:** la sección de function calling del ejemplo REST manda `"tools"` (con funciones de tipo `function`) y `"tool_choice": "auto"`, el mismo formato que usa `llamarIA()`. La página solo muestra `"auto"`; no lista otros valores de `tool_choice`.
- **Modelo:** el ejemplo oficial usa `gemini-3.8-flash`.
- **Advertencia de la página:** el soporte de las librerías de OpenAI «todavía está en beta».

**Esquemas que se envían:** `llamarIA()` quita `pattern`, `format` y `maxLength`, porque Gemini rechazaba las herramientas con ellos, y omite `parameters` en las herramientas sin propiedades (`ver_mi_horario`). La referencia oficial marca `FunctionDeclaration.parameters` como opcional (https://aistudio.google.com/api-reference/caching). La validación real sigue en `herramientas.ts`, sin cambios.

**Sin verificar:** una llamada real a Gemini y a Groq con estos esquemas, por ejemplo con `enum`. Hay que probarla antes de la demo. Si el proveedor rechaza la petición, la función responde «No pude responder ahora».

## Estructura y comandos

```
backend/supabase/functions/preguntale/index.ts        → entrada: búsqueda real en servicios_publicos y Deno.serve
backend/supabase/functions/preguntale/ia.ts           → llamarIA(): único punto del proveedor (API compatible con OpenAI por fetch; Groq por defecto); llamarIAConRespaldo(): principal y, si falla, respaldo
backend/supabase/functions/preguntale/handler.ts      → handler sin red: valida, arma la respuesta, ordena y recorta servicios
backend/supabase/functions/preguntale/herramientas.ts → las 6 definiciones y la validación de argumentos
backend/supabase/functions/preguntale/*_test.ts       → pruebas Deno sin red (fetch, la IA y la búsqueda son dobles inyectados)
backend/supabase/functions/preguntale/deno.json       → configuración de Deno de la función; deno.lock fija las versiones
```

- Local: `cd backend && npx supabase functions serve preguntale --env-file supabase/.env.local`. El archivo `.env.local` va en `.gitignore`.
- Pruebas: `deno test backend/supabase/functions/preguntale/`
- Revisión de tipos: `deno check --config backend/supabase/functions/preguntale/deno.json backend/supabase/functions/preguntale/index.ts`
- Publicar: `cd backend && npx supabase functions deploy preguntale`

## Límites

- **Siempre:** validar la entrada y la salida de la IA; responder siempre con la forma definida arriba.
- **Preguntar antes:** instalar Deno o la CLI de Supabase (no están en esta máquina); cualquier tabla nueva, por ejemplo para limitar preguntas por día.
- **Nunca:** `service_role`, guardar el texto, mandar a la IA la ubicación o datos personales, tocar `backend/database/`, `backend/pruebas/`, `app-movil/` ni `panel-web/`.

## Criterios de éxito

1. «Busca un gasfitero abierto», con una sesión de prueba, devuelve `buscar_servicio` y entre 0 y 3 servicios sacados de `servicios_publicos`.
2. «Recuérdame la pastilla a las 8 de la noche» devuelve `crear_recordatorio` con `hora: "20:00"` y `confirmar: true`.
3. Un texto sin sentido devuelve `funcion: null` y los 3 botones.
4. Si la IA responde con una función que no está en la lista, se trata igual que el caso 3 (probado sin red).
5. Sin JWT, la respuesta es `401`.
6. `grep` de `IA_API_KEY` en el repo solo encuentra `Deno.env.get` y esta spec.

## Decisiones

1. **Voz:** la app es una APK (development build), no Expo Go. La voz usa `expo-speech-recognition`.
2. **Límite de uso:** para la demo alcanza con el límite del proveedor de IA. No se agregan tablas.
3. **Herramientas:** Deno se instala con `winget install DenoLand.Deno`. La CLI de Supabase se usa con `npx supabase`, sin instalarla de forma global. La función se publica desde la CLI para que el código quede en el repo: `cd backend && npx supabase functions deploy preguntale`.
4. **Regla 1:** se corrige en la rama `luana/reglas-modulo2`, no en esta.
5. **Proveedor de IA:** Groq, con `fetch` a `https://api.groq.com/openai/v1/chat/completions`, `tools` en formato OpenAI y `tool_choice: "auto"`. Queda detrás de una sola función, `llamarIA()` en `ia.ts`. Si `arguments` no es JSON válido, cuenta como «no entiende».
6. **Zona:** la entrada acepta `zona_id`. Sin ubicación, `buscar_servicio` filtra por zona; sin ubicación ni zona, pregunta el barrio.
7. **IA de respaldo:** opcional, con `IA_RESPALDO_API_KEY`, `IA_RESPALDO_MODELO` e `IA_RESPALDO_URL`. Un solo reintento si la principal lanza error, nunca si responde sin elegir herramienta. La principal baja a 5 s para que principal y respaldo no pasen de unos 13 s.
