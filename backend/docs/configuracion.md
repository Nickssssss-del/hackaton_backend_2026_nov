# Configuración de Vecinos

Esta guía es para quien monte el proyecto en los paneles: Supabase, Twilio, Firebase y Expo. No trae scripts de base de datos. Los scripts 07 y 08 se ejecutan aparte; aquí solo se revisa lo que esos scripts esperan encontrar ya activado.

La app usa solo la clave publicable. La clave secreta, o `service_role`, nunca va en la app ni en el repositorio. Las claves de la IA y del push viven como secretos de Supabase.

Los nombres de menús cambian. En cada paso, busca la sección que se nombra. No hay una ruta fija de botones.

## 1. Supabase Auth con teléfono

La app abre con sesión anónima y después verifica el celular. El panel de administración entra con email y contraseña, y solo sigue quien esté en `es_admin()`.

1. Busca la sección de proveedores de autenticación y activa la sesión anónima.
2. Busca el proveedor de teléfono y conéctalo a Twilio como proveedor de SMS de Supabase Auth. Twilio se usa solo para el código de registro. Las llamadas y los SMS de emergencia salen del chip del celular, no de Twilio.
3. Usa una cuenta de prueba de Twilio. En esa cuenta:
   - solo envía a números verificados de antemano, hasta 5;
   - la prueba vence a los 30 días;
   - los mensajes llevan el aviso de cuenta de prueba;
   - no hay voz personalizada;
   - no hay número enmascarado (Twilio Proxy está cerrado a clientes nuevos);
   - en Perú no hay SMS de ida y vuelta, así que solo se envían códigos.
4. Para desarrollar, usa los números de prueba de Supabase con código fijo. Así no se gasta ningún SMS. Cuáles son esos números y cuál es el código fijo: por confirmar con Luana.
5. Busca la sección de usuarios y crea el acceso del panel con email y contraseña. Quién queda como administrador (`es_admin()`) y con qué cuenta: por confirmar con Luana.

## 2. Firebase y push

El push fuera de Expo Go necesita Firebase Cloud Messaging. La app se distribuye como APK, no con Expo Go. El plan de Firebase es el gratuito, Spark: el push no tiene costo.

1. Crea un proyecto de Firebase en el plan Spark y busca la sección de Cloud Messaging.
2. Sube la clave de ese proyecto a Expo, en las credenciales de Android. El nombre exacto de esa pantalla: por confirmar con Luana. La clave se anota como `<CLAVE_SERVIDOR_FIREBASE>`. No la pegues en el repositorio.
3. La app pide el token del celular con expo-notifications y lo guarda en `push_tokens`, llamando a `registrar_push_token`. No se inserta el token a mano en la tabla.
4. La Edge Function `alerta-vecinos` envía a la API de Expo Push, y Expo entrega el aviso por Firebase. El aviso inicial dice «Un vecino necesita ayuda a X m» (ejemplo: «Un vecino necesita ayuda a 120 m») y no lleva nombre ni dirección. Al cerrar, el texto es «Ya no hace falta, gracias». `alerta-vecinos` no tiene responsable asignado.

## 3. Secretos de las Edge Functions

Busca la sección de secretos del proyecto de Supabase. Van ahí, nunca en la app:

| Secreto | Para qué | Cómo anotarlo |
| --- | --- | --- |
| Clave de la IA | Modelo con llamado a funciones. Por ejemplo Claude Haiku 5.5 o Gemini Flash. La IA no responde con texto libre: devuelve qué función usar y la app la ejecuta. | `<CLAVE_DE_IA>`. El nombre exacto del secreto: por confirmar con Luana. |
| Token de Expo Push | Para que `alerta-vecinos` hable con la API de Expo Push. | `<TOKEN_DE_EXPO_PUSH>`. El nombre exacto del secreto: por confirmar con Luana. |

Cambiar de modelo de IA no pide una APK nueva: se cambia el secreto o la función en el servidor.

## 4. Lo que piden los scripts

Lista de verificación, sin volver a escribir el SQL. El script 07 crea el bucket y publica las tablas de Realtime si la publicación ya existe. Si `pg_cron` no se puede activar, el script sigue y solo avisa: hay que activar la extensión y volver a ejecutarlo.

| Qué revisar | Dónde buscarlo | Qué debe quedar |
| --- | --- | --- |
| Extensión `pg_cron` | La sección de extensiones. El script la llama Database > Extensions. | Activa, para la limpieza de emergencias cada 10 minutos. |
| Realtime | La sección de Realtime. | Publicadas las tablas `emergencias`, `eslabones`, `enlaces` y `vecinos_que_van`. Sirven para el contador de vecinos que van y para el estado de la cadena. Si la publicación no existía al correr el script 07, este paso queda por confirmar con Luana. |
| Bucket `fotos` | La sección de Storage, después de ejecutar el script 07. | Bucket privado `fotos`, de hasta 5 MB, que acepta JPEG, PNG y WebP. La ruta es `<zona_id>/<user_id>/<archivo>`. |

## 5. Antes de la demo

Abre el proyecto de Supabase antes de la demo. En el plan gratuito se pausa tras 7 días sin uso.

Límites de ese plan que importan:

| Recurso | Límite |
| --- | --- |
| Base de datos | 500 MB |
| Storage | 1 GB |
| Salida | 5 GB |
| Edge Functions | 500 000 invocaciones al mes |
| Proyectos | 2 |

## 6. Si algo de la configuración falla

| Qué pasa | Qué hacer |
| --- | --- |
| El SMS de registro no llega | Seguir con la cuenta invisible y verificar el celular después. En desarrollo, usar los números de prueba con código fijo. |
| Se acaba el cupo de la IA | La app responde con un texto fijo y los botones de siempre. El modelo se cambia en la Edge Function, sin nueva APK. |

## 7. Lista de verificación

- [ ] La app y el repositorio solo tienen la clave publicable. La clave secreta no está en ningún archivo.
- [ ] La sesión anónima está activada.
- [ ] El teléfono usa Twilio en cuenta de prueba, con hasta 5 números verificados.
- [ ] En desarrollo se usan números de prueba de Supabase y un código fijo, sin gastar SMS.
- [ ] El panel entra con email y contraseña, y el administrador está definido con `es_admin()`.
- [ ] Firebase está en el plan Spark, con Cloud Messaging.
- [ ] La clave `<CLAVE_SERVIDOR_FIREBASE>` está en las credenciales de Android de Expo, no en el repositorio.
- [ ] `<CLAVE_DE_IA>` y `<TOKEN_DE_EXPO_PUSH>` están en los secretos de Supabase.
- [ ] `pg_cron` está activo para la limpieza cada 10 minutos.
- [ ] Realtime incluye `emergencias`, `eslabones`, `enlaces` y `vecinos_que_van`.
- [ ] El bucket `fotos` existe, es privado y lo creó el script 07.
- [ ] El proyecto de Supabase está abierto y no pausado.
