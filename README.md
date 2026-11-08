# Proyecto Kuna

App «Vecinos» para el barrio: la aplicación móvil, el panel del admin y la base en Supabase. No hay servidor propio.

- `app-movil/`: app Expo (React Native, TypeScript) en MVC. Lee las vistas públicas y escribe con la clave publicable.
- `panel-web/`: React, Vite y Tailwind. El admin entra con correo y contraseña de Supabase Auth y la base confirma el permiso con `es_admin()`. El panel no lee la tabla `admins`; el alta sigue siendo a mano.
- `backend/`: SQL, pruebas de RLS, reglas y documentos.

## Base

Cada script se corre en el SQL Editor de Supabase, en este orden. Se pueden correr dos veces sin error.

1. `01_tablas.sql`: tablas, claves, restricciones y listas de categorías.
2. `02_funciones.sql`: funciones, triggers, RPC y vistas del módulo 1.
3. `03_politicas.sql`: seguridad por filas.
4. `04_datos_prueba.sql`: zonas de Ica y grupos de apoyo ficticios.
5. `05_verificaciones.sql`: comprueba que las tablas del módulo tengan RLS y que `admins` no tenga políticas para la app.
6. `06_mantenimiento.sql`: mantenimiento manual. No hace falta correrlo al montar el proyecto.
7. `07_mockup_v4.sql`: emergencias, comunidad y `yo_ayudo`, que devuelve verdadero o falso.
8. `08_ajustes_backend.sql`: reportes de comunidad, tope de emergencias reales y la marca de aviso push.
9. `09_datos_demo.sql`: datos ficticios de demo (negocios, publicaciones y un pedido). Lo ejecuta Karla.
10. `10_uso_y_comunidad.sql`: tiempo de uso por zona, sin usuario, y el lugar del evento en las publicaciones.
11. `11_admin_perfiles.sql`: el admin puede leer `perfiles`. Un vecino sigue leyendo solo el suyo. Lo ejecuta Karla después del respaldo de la base.
12. `12_admin_grupos.sql`: el admin puede crear, editar y borrar grupos de apoyo. Un vecino sigue sin poder escribir. Lo ejecuta Karla.

## Panel

En `panel-web/`:

1. Copia `.env.example` a `.env`.
2. `npm install`
3. `npm run dev`

Hacen falta `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (la clave publicable). No uses la clave secret.

Pestañas, en este orden: Resumen del día, Servicios ocultos, Grupos de apoyo, Emergencias activas, Emergencias cerradas, Comunidad oculta y Bloqueos.

## Pruebas

```bash
cd backend/pruebas && npm test
```

Copia `backend/.env.example` a `backend/.env` y pon `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Las cuentas anónimas tienen que estar activas en Supabase. Cubren los casos 1 a 20. Los casos 21 a 25 quedan fuera.

## App

En `app-movil/`, copia `.env.example` a `.env` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. La voz y la ubicación piden un development build; Expo Go no alcanza.
