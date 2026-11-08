# Vecinos - App Móvil (app-movil)

Aplicación React Native / Expo para el proyecto **Vecinos** (hackatón backend 2026 nov).

## Requisitos
- **Node.js** 18+
- **Expo Go** en el teléfono (para probar sin build nativo) **o** Development Build
- Cuenta de **Expo** (para `npx expo start` y EAS Build)

## Instalación

```bash
cd app-movil
npm install
```

Copiar variables de entorno (solo la clave **publicable** de Supabase):

```bash
cp .env.example .env
# Editar .env y poner EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY
```

> **Importante**: Nunca pongas `service_role`, claves secretas ni contraseñas en `.env`. La app usa solo la *anon key*.

## Correr en desarrollo

### Expo Go (sin micrófono)
```bash
npx expo start --go --clear
```
- Escanea el QR con la app **Expo Go** (iOS/Android).
- El micrófono **no funciona** en Expo Go (limitación de la app contenedora).

### Development Build (con micrófono)
```bash
# Una sola vez: crear el build de desarrollo
npx expo run:android
```
- En Windows usa una ruta corta para evitar problemas de longitud de path, ej.: `C:\v\hackaton_backend_2026_nov\app-movil`
- El development build **sí tiene acceso al micrófono** (voz a texto en registro, ficha, etc.).
- Para iOS: `npx expo run:ios` (requiere macOS + Xcode).

## Build APK (preview)
```bash
eas build -p android --profile preview
```
- Genera un `.apk` instalable en cualquier Android.
- Requiere cuenta Expo y proyecto vinculado (`eas init`).

## Pantallas y flujo de la demo

| Ruta | Pantalla | Descripción |
|------|----------|-------------|
| `/` | **Puerta** | Decide a dónde ir: tutorial, ubicación, registro o inicio |
| `/bienvenida/tutorial` | **Tutorial** | 3 pasos: colores, botón emergencia, escuchar/letra |
| `/bienvenida/ubicacion` | **Ubicación** | Pide permiso de ubicación (foreground) |
| `/bienvenida/ubicacion-ajustes` | **Ubicación - ajustes** | Si denegó, abre ajustes del sistema |
| `/bienvenida/zona` | **Zona** | Elige tu barrio de la lista |
| `/registro/nombre` | **Registro - Nombre** | 2-60 chars, voz + teclado, confirmar |
| `/registro/celular` | **Registro - Celular** | ^9\d{8}$, solo dígitos |
| `/registro/zona` | **Registro - Zona** | Igual que bienvenida/zona |
| `/registro/contactos-permiso` | **Contactos - Permiso** | Dar acceso a agenda o escribir manual |
| `/registro/contactos` | **Contactos** | 2 contactos (agenda/teclado) + relación (Hija/Hijo/Vecino/Otro) |
| `/registro/ficha` | **Ficha** | 5 casillas + "Ninguna" + consentimiento (Sí/No) |
| `/inicio` | **Inicio** | Saludo, estado red, botones: Buscar, Mis servicios, Ayuda, Mis datos, Emergencia |
| `/buscar` | **Buscar servicios** | Filtros: abiertos, oficio; chips; tarjetas con visto bueno |
| `/servicio/[id]` | **Detalle servicio** | Info completa, Visto Bueno, Reportar |
| `/publicar` | **Publicar - Paso 1** | Nombre negocio, oficio, descripción, precio, horario |
| `/publicar/detalles` | **Publicar - Paso 2** | Dirección, contacto, coords, emergencia |
| `/mis-servicios` | **Mis servicios** | Lista propios con editar/borrar |
| `/ayuda` | **Ayuda entre vecinos** | Pedidos cercanos + botón "Pedir ayuda" |
| `/ayuda/pedir` | **Pedir ayuda** | Categoría + descripción (140 chars) |
| `/ayuda/mis-pedidos` | **Mis pedidos** | Propios: cancelar / marcar atendido |
| `/mis-datos` | **Mis datos** | Perfil, contactos, ficha, preferencias (letra, tema, sonidos), borrar cuenta |
| `/mis-datos/contactos` | **Editar contactos** | Agenda o manual, 2 contactos + relación |
| `/mis-datos/ficha` | **Editar ficha** | Casillas + consentimiento + "Retirar consentimiento" |
| `/emergencia` | **Emergencia** | Botón rojo 2s → SMS a contactos + brigada con ficha (si consentimiento) |
| `/emergencia/numero` | **Números** | 116 (bomberos) / 105 (policía) |
| `/emergencia/peligro` | **Confirmar peligro** | Doble confirmación antes de enviar |
| `/emergencia/aviso` | **Aviso enviado** | Confirmación visual |

## Reglas clave (no negociables)

1. **Contactos, ficha, consentimiento** → solo en el teléfono (AsyncStorage `barrio.*`), **nunca** en Supabase.
2. **Mi perfil** (nombre, celular, barrio) → en teléfono +, con internet, `asegurarPerfilEnNube()` (lat/lng con `redondear3` o `null`).
3. **Texto ≥ 18 px**, **botones ≥ 52 px** (también en tamaño "Enorme"). Colores solo de `tokens.ts`. Todo texto dentro de `<Text>`.
4. **Sin internet** → aviso **amarillo**, sin la palabra "error".
5. **Fuera de esta entrega**: "Proteger mi cuenta", "Ya tengo cuenta", "Recibir avisos por SMS", "Quién me ayuda a usar la app".
6. **Emergencia** (`app/emergencia/**`, `useEmergencia.ts`) → **no se toca** en Fase 6.

## Verificaciones estáticas (11 puntos)

Ejecutar con `git grep --untracked`:
- a) `app/` y `src/vistas/` no importan `supabase` ni `*Repositorio`
- b) `app/emergencia/**` y `useEmergencia.ts` no importan `supabase`, `*Repositorio` ni `useGruposCercanos`
- c) Ninguna consulta **lee** `servicios`, `vistos_buenos`, `reportes`, `admins`, perfiles ajenos, `auth.users` (solo escrituras propias)
- d) No hay `service_role`, secret key, contraseñas ni claves en el código
- e) No hay `"dni"` en `app/` ni `src/`
- f) No hay `console.log` olvidados (`console.error` en `errores.ts` sí)
- g) No hay `fontSize < 18` ni botones `alto < 52` fuera de `tokens.ts`
- h) Pantallas de emergencia no dicen "Enviado", "va en camino", "Quédate tranquila"
- i) No hay "Necesito ayuda" fuera de `app/emergencia/`, ni "Quiero ayudar", "Linterna", "Alarma"
- j) No hay rutas duplicadas: `X.tsx` y carpeta `X/` con `index.tsx` para la misma ruta
- k) Lista de `[A COMPLETAR]` pendientes

## Validaciones finales
```bash
npx tsc --noEmit                    # Debe salir limpio
git diff app-movil/package.json     # Debe salir vacío
git diff --stat -- app-movil/app/emergencia app-movil/src/controladores/useEmergencia.ts  # Vacío
```

## Créditos
- Backend: Supabase (PostgreSQL + RLS + RPCs)
- Fuentes: Atkinson Hyperlegible (Google Fonts)
- Iconos: Sistema (texto/emoji)
- Estado: React Query (`@tanstack/react-query`) con persistencia AsyncStorage