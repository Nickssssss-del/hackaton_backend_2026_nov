# Reglas del backend

1. El backend es solo Supabase. Sin servidor propio, sin Realtime y sin PostGIS.
2. RLS activado en todas las tablas. Nunca lo desactives para que algo funcione.
3. No existe un campo `rol`. Los administradores están en la tabla `admins`, que la app no lee ni escribe.
4. La app solo lee las vistas `servicios_publicos` y `pedidos_cercanos`. Nunca lee las tablas `servicios`, `vistos_buenos` ni perfiles ajenos.
5. `lat` y `lng` son `numeric(7,3)`.
6. No pidas, guardes ni escribas claves: ni `service_role` ni contraseñas.
7. Descripciones y comentarios: máximo 140 caracteres y sin enlaces.
8. Cada vista `security definer` lleva un comentario que explica por qué.
9. Todo dato de prueba es ficticio.
10. Los scripts `01` a `05` se ejecutan en el orden numerado. No lo cambies.
11. La cuenta siempre empieza anónima: no se exige celular ni correo para usar la app. Proteger la cuenta es opcional.
12. La app nunca lee `auth.users`. Solo lo hacen funciones `security definer` con `search_path` fijo.
