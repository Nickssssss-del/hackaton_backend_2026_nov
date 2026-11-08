# Spec: página W1 «Voy en camino»

**Estado:** aprobada el 2026-11-07.

**Fuente:** funciones `enlace_ver` y `enlace_voy` de `backend/database/07_mockup_v4.sql`, en la rama `luana/reglas-modulo2`.

## Objetivo

Cuando una persona activa una emergencia, sus 2 contactos reciben un SMS con un enlace `…/voy-en-camino/?t=TOKEN`. Esos contactos no tienen la app ni cuenta. La página les muestra quién necesita ayuda y dónde, y les deja avisar con un toque «Voy en camino».

Es una página estática, porque Supabase no sirve HTML desde Edge Functions: el `GET text/html` se reescribe como `text/plain`.

## Lo que ya existe en la base (no se toca)

| Función | Rol | Recibe | Devuelve | Error |
| --- | --- | --- | --- | --- |
| `enlace_ver(p_token text)` | `anon` | el token | una fila con `nombre`, `direccion`, `lat`, `lng` y `va_en_camino` | `EMERGENCIA_TERMINADA` si el token no existe, la emergencia se cerró o venció |
| `enlace_voy(p_token text)` | `anon` | el token | `true`, y marca `va_en_camino_en` y el eslabón | `EMERGENCIA_TERMINADA` |

`nombre`, `direccion`, `lat` y `lng` pueden venir vacíos (`null`). `lat` y `lng` son la ubicación exacta (6 decimales).

## Pantallas

| Estado | Cuándo | Qué se ve |
| --- | --- | --- |
| Cargando | Mientras responde `enlace_ver` | «Cargando…» |
| Ayuda | `enlace_ver` respondió con `va_en_camino = false` | **«{nombre} necesita ayuda»**, la dirección si hay, el botón «Ver en el mapa» si hay coordenadas y el botón grande **«Voy en camino»** |
| Gracias | Después de `enlace_voy`, o si `va_en_camino` ya era `true` | **«Gracias, {nombre} sabe que vas»**, y se mantienen la dirección y el mapa |
| Terminada | Falta `t`, `t` no tiene el formato del token (64 caracteres hexadecimales) o la base responde `EMERGENCIA_TERMINADA` | **«Esta emergencia ya terminó»**, sin llamar a la base cuando el token es inválido |
| Sin conexión | Falla la red, o pasan 10 s sin respuesta (tope con `AbortSignal.timeout`) | «No hay conexión. Revisa tu internet.» y el botón «Intentar otra vez» |
| Error | Cualquier otro error | «Algo salió mal. Inténtalo otra vez.» y el botón «Intentar otra vez» |

- **Nombre vacío:** si `nombre` viene `null`, se usa «Tu familiar».
- **«Ver en el mapa»:** abre `https://www.google.com/maps?q=lat,lng` en una pestaña nueva, con `rel="noopener noreferrer"`.
- **Doble toque:** «Voy en camino» se desactiva mientras se envía. Igual, la base ignora un segundo envío.

## Archivos

```
backend/web/voy-en-camino/index.html          → página y conexión con la pantalla (script module en línea)
backend/web/voy-en-camino/logica.js           → funciones puras y llamarRpc() (recibe fetch inyectado), sin pantalla
backend/web/voy-en-camino/logica_test.js      → pruebas deno test, escritas antes que logica.js
backend/web/voy-en-camino/config.example.js   → versionado: export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";
backend/web/voy-en-camino/config.js           → local, con los valores reales; en .gitignore
backend/web/voy-en-camino/.gitignore          → config.js
```

Funciones de `logica.js`:

- `leerToken(search)`: devuelve el token o `null`.
- `estadoDesdeVer(filas)`: decide entre «ayuda» y «gracias», con nombre, dirección y URL del mapa.
- `estadoDesdeError(error)`: decide entre «terminada», «sin conexión» y «error».
- `urlMapa(lat, lng)`: devuelve la URL de Google Maps, o `null` si no hay coordenadas.
- `textoAyuda(nombre)` y `textoGracias(nombre)`.
- `llamarRpc(config, funcion, token, enviar = fetch)`: `POST ${SUPABASE_URL}/rest/v1/rpc/{funcion}` con `{ p_token }`; lanza el `message` de la base si responde con error.

## Tecnología

- **Sin build y sin dependencias.** Nada de supabase-js ni esm.sh: un `fetch` `POST` a `${SUPABASE_URL}/rest/v1/rpc/enlace_ver` y `/rpc/enlace_voy`, con los headers `apikey` y `Content-Type: application/json`. Ningún tercero ve las visitas, y no se guarda sesión, cookies ni `localStorage`.
- **En la cabecera:** `<html lang="es">`, `<meta name="robots" content="noindex">`, `<meta name="referrer" content="no-referrer">` y `viewport` sin bloquear el zoom.
- **Seguridad del texto:** el nombre y la dirección se pintan con `textContent`, nunca con `innerHTML`, porque los escribe la persona en la app.
- **Accesibilidad:**
  - letra base de 22 px y títulos de 32 px o más;
  - botón principal de al menos 64 px de alto y a todo el ancho;
  - contraste AAA, con texto oscuro sobre fondo claro y el botón negro con texto blanco;
  - foco visible;
  - los cambios de estado se anuncian con `aria-live="polite"`.
- **Sin cookies, analítica, fuentes externas ni scripts de terceros.**

## Comandos

- Pruebas: `deno test backend/web/voy-en-camino/`
- Probar en local: copiar `config.example.js` a `config.js`, llenarlo y servir la carpeta con cualquier servidor estático, por ejemplo `npx serve backend/web/voy-en-camino`. Después abrir `http://localhost:3000/?t=TOKEN`.

## Publicar (Netlify Drop)

1. Copiar `config.example.js` a `config.js` y poner la URL de Supabase y la clave publicable.
2. Correr `deno test backend/web/voy-en-camino/`.
3. Entrar a https://app.netlify.com/drop y arrastrar la carpeta `backend/web/voy-en-camino/`, con el `config.js` local. No hay build.
4. La URL que pone la app en el SMS es `https://<sitio>.netlify.app/?t=TOKEN`.
5. Probar la URL sin `?t=`: debe decir «Esta emergencia ya terminó».

La carpeta también lleva los archivos de prueba; no hacen daño, porque la página nunca los carga.

## Límites

- **Siempre:** solo la clave publicable; validar el token antes de llamar a la base; texto con `textContent`.
- **Preguntar antes:** cualquier cambio en `enlace_ver` o `enlace_voy`; agregar dependencias.
- **Nunca:** la clave secret o `service_role`; tocar `backend/database/`, `backend/pruebas/`, `app-movil/` ni `panel-web/`; cookies o analítica.

## Criterios de éxito

1. `deno test backend/web/voy-en-camino/` pasa, con pruebas escritas antes de `logica.js`.
2. Sin `?t=` o con un token mal formado se ve «Esta emergencia ya terminó» y no sale ninguna petición a Supabase.
3. Con un token válido de una emergencia activa se ve «{nombre} necesita ayuda». Tras «Voy en camino» se ve «Gracias, {nombre} sabe que vas», y al recargar sigue en ese estado.
4. `git status` no muestra `config.js`, y `grep` de `service_role` en `backend/web/` no encuentra nada.
5. Un nombre con `<b>` se ve como texto, no como HTML.

## Decisiones

1. **Hosting:** Netlify Drop, gratis y subido a mano. Ver la sección «Publicar».
2. **Comentario del SQL** («Edge Function voy-en-camino»): no se toca aquí. Lo corrige quien maneja la base.
3. **Sin supabase-js:** `fetch` directo a `/rest/v1/rpc/...`, para que ningún tercero vea las visitas.
4. **Ubicación exacta:** riesgo aceptado por diseño. El enlace solo va a los 2 contactos, tiene 64 caracteres aleatorios y vence al cerrar la emergencia.
