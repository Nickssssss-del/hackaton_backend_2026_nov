# Correcciones por fases (noviembre 2026)

Rama: `fix/app-movil-fases-offline`, basada en `Implementacion-frontend-part2` (la versión con el mapa de Esri).

> Después de `npm install`, vuelve a generar la app de desarrollo (`scripts/correr-android.ps1` o `npx expo run:android`): se agregó `expo-file-system` como dependencia directa.

## Fase 1 · Ocultar categorías sin negocios

- **Qué pasaba:** en «¿Qué buscas?» salían las 6 categorías aunque alguna no tuviera ningún negocio, y al tocarla se abría una lista vacía.
- **Cambio:** solo se muestran las categorías con al menos un negocio en tu barrio. Si no hay ninguno, sale «Aún no hay negocios en tu barrio» y el botón «Sube tu negocio». La voz lee solo las categorías que se ven.
- **Archivos:** `app/servicios/index.tsx`, `src/modelos/categoriasServicio.ts` (`categoriasConNegocios`).
- **Probar:** abre Servicios. Solo deben aparecer las categorías que tienen negocios.

## Fase 2 · Mapa con y sin internet

- **Qué pasaba:** el mapa bajaba cada cuadrito (tesela) de internet. Sin conexión no había mapa.
- **Cambio:**
  - Cada tesela que se ve con internet se guarda en el teléfono (`Documentos/teselas`).
  - Sin internet se dibuja la copia guardada. Si falta esa tesela exacta, se amplía una de menos zoom que sí esté guardada.
  - Al abrir la app con internet se guarda el mapa alrededor de tu casa y de tu última ubicación, en los zooms 13 a 17 (unas 50 teselas por lugar). Se repite una vez al día o si cambiaste de zona.
  - Sin internet, abajo dice «Mapa guardado · © Esri…». Si la zona nunca se guardó, el mapa dice que tu punto sí se ve.
  - Tope de unas 1500 teselas (≈ 30 MB). Si se pasa, se borran las más antiguas.
- **Archivos:** `src/modelos/local/cacheTeselas.ts`, `src/controladores/mapaSinInternet.tsx`, `src/vistas/componentes/MapaOSM.tsx`, `src/modelos/mapaOSM.ts`, `app/_layout.tsx`.
- **Probar:** con internet abre «Postas, bomberos y policía cerca». Pon el modo avión y vuelve a abrirlo: el mapa debe verse igual.

## Fase 3 · Dictar el celular completo

- **Qué pasaba:** en «Confirma tu celular» solo quedaban los 3 primeros números. Android cortaba el dictado en la primera pausa («939…»). Además, lo dicho se recortaba antes de pasar las palabras a números.
- **Cambio:** los campos de celular y código usan el modo números de `useVoz`:
  - escucha de forma continua y no corta en las pausas;
  - junta los pedazos y llena el campo mientras hablas;
  - pasa las palabras a números («novecientos treinta y nueve», «nueve tres nueve», «939 12 34 56»);
  - si el motor se corta, vuelve a escuchar solo, hasta 25 s;
  - deja de escuchar al llegar a 9 dígitos (celular) o a 6 (código).
- **Archivos:** `src/controladores/useVoz.ts`, `src/modelos/numeroDicho.ts` (`digitosDichos`), `src/vistas/componentes/CampoConVoz.tsx` (prop `digitos`), `app/perfil/verificar.tsx`, `app/perfil/celular.tsx`, `app/alta/contactos.tsx`.
- **Probar:** en Confirma tu celular toca el micrófono y di «939… 123… 456», con pausas. Deben quedar los 9 números.

## Fase 4 · Detectar caídas

- **Qué pasaba:** el detector pedía un golpe de más de 2,5 g y leía el sensor 20 veces por segundo. Sobre una cama el golpe es suave (1,6 a 2,5 g) y dura 30 a 60 ms, así que casi nunca se detectaba.
- **Cambio:** ahora se lee el sensor 50 veces por segundo. Una caída es:
  - caída libre de menos de 0,6 g durante 100 ms o más;
  - un golpe de más de 1,6 g antes de 1 s;
  - 1,5 s casi quieto, sin contar los rebotes.
- **Simulación:** acierta en 7 de 7 casos:
  - se detecta al caer en la cama desde 20 y 30 cm y al piso desde 1 m;
  - no se detecta al caminar, correr, dejarlo en la mesa ni saltar.
- **Archivos:** `src/modelos/detectorCaida.ts`, `src/controladores/DetectorDeCaidas.tsx`.
- **Probar:** con «Detectar caídas» en Sí y la app abierta, deja caer el celular sobre la cama desde unos 30 cm. Debe abrir «¿Estás bien?» con «Parece que te caíste».

## Fase 5 · Alerta vecinal: lo que ven A y B

- **B ve el mapa y el círculo:**
  - el mapa sale al instante con la ubicación ya conocida y luego se afina con el GPS;
  - si falla subir el perfil, la alerta igual se ve;
  - si el aviso llega con la app abierta, la alerta se abre sola.
- **A ve «1 vecino puede ver dónde estás» y el contador:**
  - la llamada a `alerta-vecinos` se cortaba a los 8 s. Los vecinos sí recibían el aviso, pero A nunca se enteraba. Ahora espera hasta 45 s;
  - el contador se relee cada 10 s, además de Realtime. Desde que hay vecinos avisados se muestra «Vecinos avisados: aún nadie confirmó que va»;
  - se corrigió la frase: «1 vecino puede…» y «2 vecinos pueden…».
- **Al cancelar en A, B ve «Esta emergencia ya terminó»:**
  - si A cancelaba mientras la emergencia aún se registraba, no se cerraba y quedaba activa 2 h. Ahora espera a tener el id y la cierra;
  - en B, el aviso de cierre marca la alerta como terminada al instante, y tocarlo también abre esa pantalla;
  - la alerta se consulta cada 8 s y también al volver a la app (por ejemplo, desde «Cómo llegar»).
- **Archivos:** `src/controladores/useAlertaVecinal.ts`, `src/controladores/AvisosDeVecinos.tsx`, `src/controladores/eventosAlerta.ts`, `src/controladores/useEmergenciaNube.ts`, `app/sos/pidiendo.tsx`.
- **Probar con dos teléfonos:** son las pruebas del punto 10 de la lista. Necesitan los SQL 07, 08 y 09, Twilio y Firebase.
