# Spec: Edge Function `alerta-vecinos`

**Estado:** aprobada el 2026-11-08.

**Fuente:** `contrato_modulo2.md` (sección 7), `vecinos_para_alerta` en `07_mockup_v4.sql` y `reclamar_aviso` en `08_ajustes_backend.sql`.

## Objetivo

Cuando Rosa activa o cierra una emergencia, avisar por push a los vecinos que tienen la alerta activa a 500 m o menos. El aviso no lleva nombre ni dirección: el vecino los pide aparte, al confirmar.

## Qué recibe

`POST /functions/v1/alerta-vecinos`, con la sesión de Rosa en `Authorization: Bearer <jwt>`.

```json
{ "emergencia_id": "uuid", "tipo": "inicio" }
```

| Campo | Regla |
| --- | --- |
| `emergencia_id` | Obligatorio, uuid. |
| `tipo` | `inicio` o `cierre`. |

## Qué hace, en orden

1. **Valida la entrada.** Si no es válida, responde `400 { error: "ENTRADA_INVALIDA" }`.
2. **Comprueba que la emergencia es de quien llama.** Con un cliente que usa la clave publicable y el JWT de quien llama:
   - lee el usuario con `auth.getUser()`;
   - lee `emergencias` con `select id, persona` y ese `id`.

   Si no hay fila, o `persona` no es el usuario de la sesión, responde `403 { error: "NO_ES_TUYA" }` sin hacer nada más.

   La comparación con `persona` hace falta porque la política `emergencias_leer` también deja leer la emergencia al admin y al vecino que confirmó «voy». Solo con RLS, «la ve» no significa «es suya».
3. **Reclama el aviso.** Con un cliente `service_role` llama `reclamar_aviso(p_emergencia, p_tipo)`.
   - Si devuelve `false`, responde `200 { avisados: 0 }` sin enviar nada. Pasa si es práctica, si no avisa a vecinos, si ya se avisó, si está vencida o si es un cierre sin aviso inicial.
   - La clave `SUPABASE_SERVICE_ROLE_KEY` sale de `Deno.env`, que la pone Supabase; nunca se escribe en el código.
4. **Busca los destinatarios** con `vecinos_para_alerta(p_emergencia)`, también con `service_role`. Devuelve `user_id`, `token` y `distancia_m`.
5. **Envía por Expo Push:** `POST https://exp.host/--/api/v2/push/send`, en lotes de hasta 100 mensajes.
   - **Inicio:** `body` «Un vecino necesita ayuda a X m», con X redondeado a 10 m y como mínimo 10. Ejemplo: 117 m → «a 120 m».
   - **Cierre:** `body` «Ya no hace falta, gracias».
   - Cada mensaje lleva `title: "Kuna"`, `sound: "default"`, `priority: "high"` y `data: { emergencia_id, tipo }`. **Nunca** nombre, dirección ni coordenadas.
   - `channelId: "emergencias"` queda como constante comentada en el código hasta que el equipo de la app confirme que crea ese canal.
   - Si existe el secreto opcional `EXPO_ACCESS_TOKEN`, se envía como `Authorization: Bearer`.
   - **Reintento:** si un lote falla por error de red, por tiempo agotado o por un 5xx de Expo, se espera 1 s y se reintenta una vez. Si vuelve a fallar, se registra en el log y se sigue con el siguiente lote. Un 4xx no se reintenta.
   - **Tokens vencidos:** los tickets `DeviceNotRegistered` solo se cuentan en el log. No se borran por ahora.
6. **Responde `200 { avisados }`.** `avisados` es la cantidad de tickets de Expo con `status: "ok"`.

| Código HTTP | `error` | Cuándo |
| --- | --- | --- |
| 400 | `ENTRADA_INVALIDA` | JSON roto, `emergencia_id` que no es uuid o `tipo` fuera de la lista. |
| 401 | `SIN_SESION` | No llega `Authorization: Bearer`. Supabase ya rechaza un JWT inválido antes de entrar. |
| 403 | `NO_ES_TUYA` | La emergencia no existe o no es de quien llama. |
| 405 | `METODO_INVALIDO` | Cualquier método que no sea `POST`. |
| 500 | `ERROR_INTERNO` | Falla la base. Si falla Expo, la respuesta es `200 { avisados }` con los que sí salieron. |

## Privacidad y logs

- Los logs solo guardan el tipo de error y conteos (destinatarios, lotes y ok). Nunca tokens, ubicaciones, distancias por persona, ids de usuario ni el JWT.
- El cliente `service_role` solo se usa para `reclamar_aviso` y `vecinos_para_alerta`, después de comprobar que la emergencia es de quien llama.

## Estructura (igual que `preguntale`)

```
backend/supabase/functions/alerta-vecinos/handler.ts       → lógica con dependencias inyectadas: validar, comprobar dueña, reclamar, armar mensajes, lotes, contar
backend/supabase/functions/alerta-vecinos/handler_test.ts  → pruebas deno test sin red, escritas antes que handler.ts
backend/supabase/functions/alerta-vecinos/index.ts         → solo arma las piezas: clientes de Supabase, fetch a Expo, Deno.serve
backend/supabase/functions/alerta-vecinos/deno.json        → { "nodeModulesDir": "none" }
```

Dependencias que se inyectan en el handler:

- `esDeQuienLlama(authorization, emergenciaId) → boolean`
- `reclamarAviso(emergenciaId, tipo) → boolean`
- `destinatarios(emergenciaId) → { token, distancia_m }[]`
- `enviarLote(mensajes) → tickets[]`. Lanza `ErrorEnvio` con `reintentable` cuando Expo responde 5xx; un `TypeError` (red) o un `TimeoutError` también se reintentan.
- `esperar(ms)` y `log(texto)`, para probar el reintento y los logs sin esperar ni ensuciar la consola.

## Comandos

- Pruebas: `deno test backend/supabase/functions/alerta-vecinos/`
- Revisión de tipos: `deno check --config backend/supabase/functions/alerta-vecinos/deno.json backend/supabase/functions/alerta-vecinos/index.ts`
- Publicar: `cd backend && npx supabase functions deploy alerta-vecinos`

## Límites

- **Siempre:** comprobar la dueña antes de usar `service_role`; validar la entrada; lotes de 100 o menos.
- **Preguntar antes:** borrar tokens que Expo marque `DeviceNotRegistered` (tocaría `push_tokens` con `service_role`); reintentos o colas; cualquier cambio en la base.
- **Nunca:** escribir la clave `service_role` en el código o en archivos versionados; mandar nombre, dirección o coordenadas en el push; tocar `backend/database/`, `backend/pruebas/`, `contrato_modulo2.md`, `app-movil/` ni `panel-web/`.

## Criterios de éxito (probados sin red)

1. Una emergencia ajena (o un `persona` distinto) responde 403, y `reclamarAviso` no se llama.
2. Si `reclamarAviso` da `false`, responde `{ avisados: 0 }` y no se envía nada.
3. 250 destinatarios salen en 3 lotes (100, 100 y 50).
4. El texto de inicio redondea a 10 m (117 → 120, 4 → 10). El de cierre es «Ya no hace falta, gracias».
5. Ningún mensaje contiene nombre, dirección ni coordenadas, y `data` solo trae `emergencia_id` y `tipo`.
6. `avisados` cuenta solo los tickets `ok`. Si un lote falla, se cuentan los demás.
7. Los logs de las pruebas no contienen ningún token.

## Decisiones

1. **Aviso perdido:** un reintento por lote, con 1 s de espera, ante error de red, tiempo agotado o 5xx de Expo. Si vuelve a fallar, va al log y se sigue con el siguiente lote. Alcanza para la demo.
2. **`DeviceNotRegistered`:** se cuenta en el log y no se borra el token. Queda para después.
3. **Canal de Android:** se envían `priority: "high"` y `sound: "default"`. `channelId: "emergencias"` queda comentado hasta que la app confirme el canal.
4. **Destinatarios del cierre:** se recalculan al cerrar. Alguien que activó la alerta después del inicio puede recibir «Ya no hace falta, gracias» sin haber recibido el primero. Es aceptable, porque ese texto no revela datos.
5. **JWT:** se usa `auth.getUser()`, que no depende de cómo esté configurado `verify_jwt`.
