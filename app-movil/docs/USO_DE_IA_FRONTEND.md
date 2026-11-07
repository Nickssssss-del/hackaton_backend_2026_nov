# Uso de IA en el Frontend (app-movil)

## Herramienta
- **GitHub Copilot** (modelo: [A COMPLETAR])

## Qué se generó en cada fase

### Fase 1 - Configuración base y navegación
- Estructura de carpetas `app/` con Expo Router
- `_layout.tsx` con proveedores (Tema, Consulta, Sesión)
- Pantalla de entrada (`index.tsx`) con lógica de routing inicial
- Configuración de TypeScript, Babel, Metro
- Fuentes Atkinson Hyperlegible

### Fase 2 - Bienvenida y tutorial
- `app/bienvenida/tutorial.tsx` - 3 pasos con "Escuchar" y "Saltar"
- `app/bienvenida/ubicacion.tsx` y `ubicacion-ajustes.tsx` - permisos de ubicación
- `app/bienvenida/zona.tsx` - selección de zona

### Fase 3 - Registro completo
- `app/registro/nombre.tsx` - nombre (2-60 chars, voz + teclado)
- `app/registro/celular.tsx` - celular (^9\d{8}$)
- `app/registro/zona.tsx` - zona con lista de `zonas_publicas`
- `app/registro/contactos-permiso.tsx` - permiso contactos o manual
- `app/registro/contactos.tsx` - 2 contactos (agenda o teclado) + relación
- `app/registro/ficha.tsx` - 5 casillas + "Ninguna" + consentimiento (Sí/No)
- Controlador `useRegistro` unificado
- Modelos locales: `perfil`, `contactos`, `ficha`, `preferencias`, `almacen`

### Fase 4 - Inicio, buscar, servicios, ayuda
- `app/inicio.tsx` - saludo, estado conexión, accesos directos
- `app/buscar.tsx` - filtros (abiertos, oficio), chips, tarjetas
- `app/servicio/[id]/index.tsx` - detalle con Visto Bueno, Reportar
- `app/publicar/index.tsx` + `detalles.tsx` - crear servicio (140 chars, sin enlaces)
- `app/mis-servicios.tsx` - lista propios con editar/borrar
- `app/ayuda/index.tsx` - pedidos cercanos + "Pedir ayuda"
- `app/ayuda/pedir.tsx` - crear pedido (categoría, descripción)
- `app/ayuda/mis-pedidos.tsx` - propios con cancelar/marcar atendido
- Vistas: `TarjetaServicio`, `Tarjeta`, `EstadoVista`, `Encabezado`, `Boton`, `BotonVoz`, `CampoTexto`, `Aviso`, `BarraRegistro`
- Controladores: `useServicios`, `usePublicarServicio`, `useMisServicios`, `useDarVistoBueno`, `useReportarServicio`, `useAyuda`, `useConexion`, `useEscuchar`, `usePerfil`, `useZona`, `useGruposCercanos`

### Fase 5 - Emergencia (intocable en Fase 6)
- `app/emergencia/index.tsx` - botón rojo 2s, cuenta regresiva, SMS
- `app/emergencia/numero.tsx` - marcar 116 / 105
- `app/emergencia/peligro.tsx` - confirmar peligro
- `app/emergencia/aviso.tsx` - aviso enviado
- `useEmergencia.ts` - lógica completa (SMS, contactos, ficha, brigada)
- Assets: `base.json`, `instrucciones.json`, `puntos_seguros.json`
- **Prohibido modificar en Fase 6**

### Fase 6 - Mis datos, Borrar mis datos, revisión final
- `app/mis-datos/index.tsx` - pantalla principal con:
  - Tamaño de letra (Normal/Grande/Enorme) → `local/preferencias` + TemaProveedor
  - Modo oscuro (sí/no) → tema "oscuro" de `tokens.ts`
  - Sonidos/voz (sí/no) → [A COMPLETAR] persistir
  - Mi perfil (nombre, celular, barrio) + "Cambiar" → validaciones registro + `asegurarPerfilEnNube()`
  - A quién avisamos (2 contactos + brigada) + "Cambiar" → `/mis-datos/contactos`
  - Mi ficha + consentimiento + "Cambiar" → `/mis-datos/ficha`
  - Mis servicios → `/mis-servicios`
  - Mis pedidos → `/ayuda/mis-pedidos`
  - Ver tutorial → `/bienvenida/tutorial`
  - **Borrar mis datos** (botón discreto):
    - Doble confirmación
    - Sin internet → aviso amarillo "Necesitas internet para borrar tus datos."
    - Con internet → `asegurarSesionAnonima()` → `rpc borrar_mis_datos`
      - Fallo RPC → mensaje neutro, NO borra local
      - Éxito → borra `barrio.*` de AsyncStorage, limpia caché react-query (persistida), `signOut()` Supabase, `router.replace("/")`
- `app/mis-datos/contactos.tsx` - editar contactos (reutiliza lógica registro)
- `app/mis-datos/ficha.tsx` - editar ficha + consentimiento + "Retirar consentimiento"
- Eliminado `app/mis-datos.tsx` antiguo (colisionaba con carpeta)
- Corrección warning "Text strings must be rendered within a <Text> component" en `app/inicio.tsx` y componentes
- 11 verificaciones estáticas (a-k)
- `app-movil/docs/USO_DE_IA_FRONTEND.md` (este archivo)
- `app-movil/README.md` actualizado

## Qué entregó el equipo
- **Mockups**: Páginas 1-8 (registro, inicio, buscar, servicio, publicar, ayuda, emergencia, mis datos)
- **SQL del backend**: `backend/database/01_tablas.sql` a `05_indices.sql`, `02_funciones.sql` (RPCs, vistas, triggers)
- **Datos de emergencia**: `assets/emergencia/base.json`, `instrucciones.json`, `puntos_seguros.json`

## Cómo se revisó
- `npx tsc --noEmit` al final de cada parte
- Búsquedas `git grep --untracked` para 11 verificaciones (a-k)
- Pruebas en **Expo Go** (sin micrófono)
- Pruebas en **Development Build** / **APK** (con micrófono): `npx expo run:android` en ruta corta (`C:\v`)
- Build preview: `eas build -p android --profile preview`

## Quién revisó cada fase
- Fase 1: [A COMPLETAR]
- Fase 2: [A COMPLETAR]
- Fase 3: [A COMPLETAR]
- Fase 4: [A COMPLETAR]
- Fase 5: [A COMPLETAR]
- Fase 6: [A COMPLETAR]

> No se inventan nombres ni fechas. Pendiente de completar por el equipo.