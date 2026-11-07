# Proyecto Vecinos — Análisis del frontend móvil

Repositorio analizado: hackaton_backend_2026_nov  
Fecha: 2026-11-07  
Alcance: análisis de preparación del frontend móvil; no se modificó backend ni panel administrativo y no se instalaron dependencias.

1. Resumen ejecutivo

El repositorio ya contiene un frontend móvil funcional en app-movil/, además del backend Supabase en backend/ y un panel independiente en panel-web/. Por tanto, la situación real no es un frontend vacío: existe una base móvil que debe evolucionar respetando el SQL y las políticas RLS.

La aplicación usa Expo Router, TypeScript, React Native, Supabase con sesión anónima, AsyncStorage, NetInfo, ubicación, contactos, SMS, voz y reconocimiento de voz. La emergencia debe permanecer local y no depender de Supabase.

2. Estructura real

hackaton_backend_2026_nov/
├── app-movil/
│   ├── app/                         # Rutas Expo Router existentes
│   ├── assets/emergencia/           # Datos locales de emergencia
│   ├── src/controladores/           # Hooks y lógica de interfaz
│   ├── src/modelos/                 # Supabase, repositorios, tipos y geo
│   ├── src/vistas/                  # Componentes existentes
│   ├── android/                     # Proyecto nativo generado
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── database/                    # SQL 01 a 06
│   ├── docs/                        # Contrato y especificación
│   └── pruebas/                     # Pruebas RLS Node
├── panel-web/                       # Panel administrativo independiente
└── README.md

3. Archivos relevantes del backend

backend/AGENTS.md: reglas obligatorias de Supabase, RLS, privacidad y límites de datos.
backend/database/01_tablas.sql: tablas, columnas, restricciones, índices y tipos de datos.
backend/database/02_funciones.sql: funciones, triggers, vistas públicas y permisos de ejecución.
backend/database/03_politicas.sql: políticas RLS de lectura y escritura.
backend/database/04_datos_prueba.sql: datos ficticios para pruebas.
backend/database/05_verificaciones.sql: verificaciones y mantenimiento de datos de validación.
backend/database/06_mantenimiento.sql: mantenimiento manual, no parte del orden normal de instalación.
backend/docs/contrato_app_base.md: contrato resumido para la aplicación.
backend/docs/especificacion.md: alcance funcional y límites del módulo.
backend/pruebas/rls.test.mjs: 20 pruebas automatizadas de RLS y reglas de negocio.

4. Configuración y dependencias actuales

app-movil/package.json declara:

Expo ~58.0.23.
React Native 0.88.1.
React 19.3.0.
Expo Router ~58.0.30.
TypeScript ~6.0.3.
@supabase/supabase-js.
AsyncStorage.
NetInfo.
Expo Location, Contacts, SMS, Speech y Speech Recognition.
React Query y persistencia local.

app-movil/app.json ya incluye plugins para Expo Router, ubicación, contactos, development client y reconocimiento de voz. El README indica que voz y ubicación requieren development build; Expo Go no cubre todo el comportamiento requerido.

No se recomienda actualizar Expo, React o React Native sin verificar compatibilidad conjunta. Antes de instalar paquetes adicionales debe comprobarse que sean compatibles con Expo SDK 58 y que no dupliquen capacidades existentes.

5. Tablas del backend

backend/database/01_tablas.sql define estas tablas públicas:

Tabla
Uso del frontend
Restricción principal
zonas
Selección y validación de zona
Lectura pública; escritura administrativa
perfiles
Fila propia del vecino
Cada usuario solo puede leer/escribir su propia fila
admins
Administración
La app no la lee ni escribe
servicios
Publicación propia
La app inserta; no debe consultar la tabla directamente
vistos_buenos
Votos y comentarios
Inserción propia; lectura propia o administrativa
reportes
Reportar servicios
Inserción propia; lectura administrativa
grupos_apoyo
Grupos de apoyo
Lectura pública; escritura administrativa
pedidos_ayuda
Solicitudes de ayuda
Crear/editar propios; lectura limitada por RLS
ayudas_ofrecidas
Registro de ofrecimientos
Lectura limitada al ayudante, autor del pedido o admin

Reglas de datos verificadas:

lat y lng usan precisión numeric(7,3).
Los perfiles requieren nombre, celular, zona y coordenadas para estar completos según perfil_completo().
Las descripciones y comentarios tienen máximo 140 caracteres y no deben contener enlaces.
La cuenta comienza con sesión anónima; protegerla con SMS queda fuera del MVP.
No existe un campo rol; los administradores se identifican en admins.

6. Vistas y lecturas permitidas

El contrato de backend/docs/contrato_app_base.md y los permisos SQL establecen estas lecturas para la app:

servicios_publicos

Lectura pública y autenticada de servicios filtrados por reglas del backend. Expone nombre, negocio, oficio, descripción, precio, horario, estado de apertura, zona, coordenadas, dirección/contacto solo cuando el autor lo permite, vistos buenos, comentario destacado e indicador de si el servicio es propio.

La app no debe sustituir esta vista por una lectura directa de servicios.

pedidos_cercanos

Solo autenticada. Devuelve pedidos de la zona correspondiente al perfil, sin exponer teléfonos ni coordenadas ajenas. Incluye categoría, descripción, antigüedad, si el pedido es propio y si ya se ofreció ayuda.

zonas y grupos_apoyo

Se pueden leer públicamente las columnas permitidas. Las escrituras administrativas no pertenecen al cliente móvil.

Restricciones explícitas

La app nunca debe leer auth.users, admins, perfiles ajenos, la tabla base servicios para listar servicios, ni la tabla base vistos_buenos para consultar votos ajenos.

7. Funciones RPC y funciones SQL relevantes

Funciones definidas en backend/database/02_funciones.sql:

es_admin(): función administrativa; no es una operación de usuario normal.
perfil_completo(): valida si el perfil propio permite acciones de escritura.
contiene_enlace(text): valida que textos no contengan enlaces.
nombre_corto(text): normalización de nombres.
distancia_m(...): distancia geográfica usada por reglas/vistas.
inicio_dia_lima(): límites diarios de publicación.
esta_abierto(...): estado horario.
validar_zona_perfil(): valida coherencia entre perfil y zona.
proteger_verificacion(): protege campos de verificación.
limitar_publicaciones(): impone el límite diario.
proteger_servicio(): completa/protege datos de publicación.
proteger_pedido(): protege datos de solicitudes.
validar_voto(): valida propietario, zona, duplicados, motivo y límites.
ocultar_por_reportes(): oculta servicios al alcanzar el umbral de reportes.
yo_ayudo(p_pedido_id uuid): registra un ofrecimiento válido y devuelve el contacto permitido.
borrar_mis_datos(): elimina los datos del usuario autenticado según las reglas del backend.
estado_cuenta(): consulta estado de cuenta propio.
sincronizar_verificacion(): sincronización de verificación, sujeta a permisos.

La app cliente solo debe invocar RPC con permiso explícito para authenticated, principalmente yo_ayudo y borrar_mis_datos. Las funciones administrativas o internas no deben exponerse desde la UI.

8. Operaciones permitidas por RLS

zonas: select para anon y authenticated; escrituras solo admin.
perfiles: select, insert y update únicamente de la fila cuyo id coincide con auth.uid().
servicios: la app autenticada puede insertar con autor propio y perfil completo; actualizar/eliminar solo lo propio, salvo admin. Para listar, usar servicios_publicos.
vistos_buenos: insertar con vecino propio y perfil completo; leer/eliminar solo los propios, salvo admin.
reportes: insertar con vecino propio y perfil completo; leer/eliminar solo admin.
grupos_apoyo: select público; escritura solo admin.
pedidos_ayuda: insertar con autor propio y perfil completo; editar propios; lectura limitada por autor/admin y por la vista pública cercana.
ayudas_ofrecidas: lectura para ayudante, autor del pedido o admin; creación normal mediante yo_ayudo.
anon: no puede insertar, actualizar ni eliminar tablas públicas.

El frontend debe tratar los errores del backend como parte del contrato: perfil incompleto, zona distinta, voto propio, voto repetido/23505, límite diario, texto con enlace, motivo inválido, pedido no disponible y sin internet tienen mensajes específicos.

9. Funcionalidades implementables

Offline/locales

Entrada a emergencia sin sesión ni internet.
Lectura de contactos de confianza almacenados localmente.
Lectura de assets/emergencia/base.json, instrucciones.json y puntos_seguros.json.
Cálculo local del punto seguro más cercano y distancia/rumbo.
Preparación de SMS que la persona debe enviar manualmente.
Lectura de instrucciones mediante voz y fallback a texto grande.
Persistencia local de perfil, preferencias, ficha de emergencia y ubicación necesaria para la experiencia offline.

Con conexión y sesión anónima

Leer zonas y grupos de apoyo.
Leer servicios desde servicios_publicos.
Leer pedidos desde pedidos_cercanos cuando el perfil y la sesión lo permitan.
Guardar o actualizar el perfil propio.
Publicar servicios mediante insert en servicios, dejando que la base aplique autor/zona/reglas.
Votar en vistos_buenos con motivo obligatorio y comentario válido.
Reportar servicios.
Crear solicitudes en pedidos_ayuda.
Ofrecer ayuda mediante rpc yo_ayudo.
Eliminar datos propios mediante rpc borrar_mis_datos y limpiar el almacenamiento local después de confirmar éxito.

10. Funcionalidades que requieren aclaración o quedan fuera

Protección de cuenta por SMS: el backend la deja fuera del MVP.
Flujo completo de verificación de celular: existen campos y funciones relacionadas, pero no hay que inventar un proveedor SMS ni un endpoint.
Gestión administrativa de zonas, grupos, reportes y ocultamiento: pertenece al panel/Supabase, no a la app móvil.
Mapas embebidos: no hay PostGIS ni react-native-maps; las indicaciones deben abrir Google Maps si se implementan, avisando que la ubicación es aproximada.
Datos de emergencia oficiales: la app debe mostrar solo lo que esté en los JSON locales; si falta número o fecha de verificación, dejar [A COMPLETAR] y avisar.
La política permite leer ciertas tablas base solo en contextos concretos, pero el contrato de app ordena usar vistas públicas para evitar exposición de datos.
Debe confirmarse el diseño final del modo oscuro, tamaños tipográficos y paleta de emergencia antes de convertirlos en tokens definitivos.

11. Arquitectura móvil propuesta

Mantener MVC:

app/: rutas Expo Router y composición de pantallas; no contiene acceso directo a Supabase.
src/modelos/: tipos, almacenamiento local, cliente Supabase y repositorios.
src/controladores/: hooks de conexión, ubicación, voz, registro, emergencia y acciones remotas.
src/vistas/: componentes reutilizables, tema, tokens y estados visuales.
assets/: contenido estático local de emergencia.

Reglas de dependencia:

Las vistas reciben props y callbacks; no consultan Supabase.
Los controladores coordinan sesión, conexión, almacenamiento y repositorios.
Los repositorios son la única capa que conoce tablas/vistas/RPC.
La capa local nunca depende de Supabase para el flujo de emergencia.
Todo dato enviado a la nube debe validarse y redondear coordenadas a tres decimales en el repositorio o antes del envío, de acuerdo con el contrato real.

12. Estructura futura recomendada

app-movil/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── emergencia.tsx
│   ├── inicio.tsx
│   ├── registro/
│   ├── servicios/
│   ├── ayuda/
│   └── mis-datos.tsx
├── src/
│   ├── controladores/
│   ├── modelos/
│   │   ├── local/
│   │   └── repositorios/
│   └── vistas/
│       ├── componentes/
│       └── tema/
├── assets/emergencia/
└── docs/

La estructura debe adaptarse a los archivos que ya existen: no conviene duplicar supabase.ts, tipos.ts, repositorios ni componentes sin migración controlada.

13. Riesgos técnicos

Desalineación de versiones: Expo SDK 58 aparece junto a React 19.3, React Native 0.88 y TypeScript 6; antes de cambiar dependencias hay que validar el conjunto con npx expo doctor y el build Android.
Development build obligatorio: ubicación, voz y reconocimiento de voz requieren configuración nativa; no asumir que Expo Go basta.
RLS y sesión anónima: el rol authenticated se usa para la sesión anónima de Supabase; una UI que asuma usuario protegido o correo romperá el flujo.
Privacidad: no consultar perfiles ajenos, auth.users, admins ni tablas base para listados públicos.
Precisión geográfica: el backend guarda coordenadas a tres decimales; la emergencia local puede necesitar coordenadas exactas, pero esas no deben enviarse a Supabase fuera del contrato.
Errores de negocio: muchas validaciones ocurren en triggers y funciones; la app debe traducir códigos y no ocultar errores desconocidos.
Offline sin cola: sin internet se puede leer lo local, pero no se deben guardar acciones remotas pendientes salvo que el backend/alcance lo autorice.
Datos de emergencia incompletos: números y fechas deben verificarse antes de presentarse como oficiales.
Rutas existentes: ya hay pantallas en app/; los cambios deben preservar las rutas y evitar duplicar funcionalidad.
Estado del workspace: este informe fue generado fuera del worktree del backend porque ese workspace hijo tenía bloqueo de escritura; por ello debe copiarse a docs/ANALISIS_FRONTEND_MOVIL.md en el repositorio hackaton_backend_2026_nov cuando el entorno permita escritura.

14. Base para el prompt de Fase 1

La Fase 1 debe trabajar sobre la app existente, no crear un proyecto Expo desde cero. El prompt debe exigir:

Leer backend/AGENTS.md, backend/docs/contrato_app_base.md, backend/docs/especificacion.md y los SQL 01-03 antes de editar.
No modificar backend/, panel-web/ ni android/ salvo una necesidad explícitamente autorizada.
Auditar primero los archivos móviles existentes y listar archivos exactos antes de editar.
Consolidar tipos, almacenamiento local, cliente Supabase y repositorios sin inventar tablas/RPC.
Mantener la emergencia independiente de Supabase.
Usar únicamente servicios_publicos, pedidos_cercanos, zonas, grupos_apoyo, la fila propia de perfiles y las operaciones permitidas.
Validar con TypeScript y las pruebas apropiadas sin instalar paquetes innecesarios.
Detenerse al terminar la fase y entregar informe de archivos, comandos, decisiones, pendientes y riesgos.

15. Comandos de inspección ejecutados

Get-ChildItem -Recurse -File -Force C:\GitHub\hackaton_backend_2026_nov
Lectura de README.md, app-movil/package.json, app-movil/app.json.
Lectura de backend/AGENTS.md, backend/docs/contrato_app_base.md y backend/docs/especificacion.md.
Lectura de backend/database/01_tablas.sql, 02_funciones.sql, 03_politicas.sql y backend/pruebas/rls.test.mjs.
Búsqueda de declaraciones SQL, RPC, vistas, políticas y usos actuales en app-movil.
git status --short y git log --oneline -5 en el repositorio backend.

Conclusión: el backend y una base móvil ya existen. La siguiente fase debe ser una implementación incremental y contractual sobre app-movil, no un scaffolding ciego.
