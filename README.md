# Proyecto Barrio

Tres carpetas, sin servidor propio.

- `app-movil/`: app Expo (React Native, TypeScript) en MVC. Lee las vistas públicas y escribe con la clave publicable.
- `panel-web/`: React, Vite y Tailwind. El admin entra con correo y contraseña de Supabase Auth y la base confirma el permiso con `es_admin()`. El panel no lee la tabla `admins`; el alta sigue siendo a mano. Pantallas: servicios ocultos, grupos de apoyo, emergencias activas, comunidad oculta y bloqueos.
- `backend/`: SQL, pruebas de RLS, reglas y documentos.

## Base

En el SQL Editor, en este orden:

1. `01_tablas.sql`: tablas, claves y listas de categorías.
2. `02_funciones.sql`: funciones, triggers y vistas del módulo 1.
3. `03_politicas.sql`: seguridad por filas.
4. `04_datos_prueba.sql`: zonas de Ica y grupos de apoyo ficticios.
5. `05_verificaciones.sql`: comprobaciones de que lo anterior quedó aplicado.
6. `07_mockup_v4.sql`: tablas y vistas del mockup v4 (emergencias, comunidad, `yo_ayudo` que devuelve verdadero o falso).
7. `08_ajustes_backend.sql`: reportes de comunidad, tope de emergencias reales y `reclamar_aviso`.
8. `09_datos_demo.sql`: datos de demo (negocios, publicaciones y un pedido). Lo ejecuta Karla.

`06_mantenimiento.sql` no forma parte de ese orden: es mantenimiento manual.

Copia `backend/.env.example` a `backend/.env` y pon la URL y la clave publicable. Nunca la clave secret.

Las pruebas (`cd backend/pruebas` y `npm test`) necesitan las cuentas anónimas activas en Supabase. Cubren los casos 1 a 20. Los casos 21 a 25 quedan fuera.

## App

En `app-movil/`, copia `.env.example` a `.env` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. La voz y la ubicación piden un development build; Expo Go no alcanza.
