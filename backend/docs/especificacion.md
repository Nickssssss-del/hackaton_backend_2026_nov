# Especificación que cubre este repositorio

Fuente: Backend y tecnologías del Módulo 1, v8. Este archivo no copia el PDF.

- La base vive en Supabase. Los scripts `01` a `05` se ejecutan en orden. El `06` es mantenimiento manual.
- La app no tiene servidor propio, mapa embebido ni PostGIS. «Cómo llegar» abre Google Maps y avisa si la ubicación es aproximada.
- La voz usa reconocimiento del sistema (`es-PE`, si no `es-419`) y, si falla, un teclado grande.
- La emergencia no consulta la base: ficha local, SMS que la persona envía, pasos en voz y el punto seguro más cercano.
- Proteger la cuenta con SMS queda fuera de esta entrega.
