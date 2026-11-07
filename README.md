# Proyecto Barrio

Tres carpetas, sin servidor propio.

- `app-movil/`: app Expo (React Native, TypeScript) en MVC. Lee las vistas públicas y escribe con la clave publicable.
- `panel-web/`: React, Vite y Tailwind. El admin entra con correo y contraseña de Supabase Auth y la base confirma el permiso con `es_admin()`. Revisa los servicios ocultos con sus reportes y verifica grupos de apoyo. El admin se da de alta a mano en la tabla `admins`.
- `backend/`: SQL, pruebas de RLS, reglas y documentos.

## Base

En el SQL Editor, en este orden: `01_tablas.sql`, `02_funciones.sql`, `03_politicas.sql`, `04_datos_prueba.sql`, `05_verificaciones.sql`. El `06_mantenimiento.sql` no forma parte de ese orden.

Copia `backend/.env.example` a `backend/.env` y pon la URL y la clave publicable. Nunca la clave secret.

Las pruebas (`cd backend/pruebas` y `npm test`) necesitan las cuentas anónimas activas en Supabase. Cubren los casos 1 a 20. Los casos 21 a 25 quedan fuera.

## App

En `app-movil/`, copia `.env.example` a `.env` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. La voz y la ubicación piden un development build; Expo Go no alcanza.
