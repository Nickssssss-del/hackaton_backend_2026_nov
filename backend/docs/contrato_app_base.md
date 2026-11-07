# Contrato de la app

La app usa la clave publicable. Empieza con sesión anónima. No lee `auth.users`, `admins` ni las tablas base de otros vecinos.

## Lecturas

- `servicios_publicos` (anon y autenticado): nombre, negocio, oficio, descripción, precio, horario, abierto ahora, zona, coordenadas, dirección y contacto solo si el autor lo permitió, vistos buenos, comentario destacado y si es mío.
- `pedidos_cercanos` (solo autenticado, y solo de la zona del perfil): categoría, descripción, antigüedad, si es mío y si ya ofrecí ayuda. Sin teléfono ni coordenadas.
- `zonas` y `grupos_apoyo`: columnas públicas.

## Escrituras

| Acción | Destino |
| --- | --- |
| Publicar servicio | `insert` en `servicios`. La zona y el autor los pone la base. |
| Visto bueno | `insert` en `vistos_buenos`. |
| Reportar | `insert` en `reportes`. |
| Pedir ayuda | `insert` en `pedidos_ayuda`. |
| Guardar perfil | `upsert` de la fila propia en `perfiles`. |
| Yo ayudo | `rpc yo_ayudo` con `p_pedido_id`. Devuelve nombre y celular. |
| Borrar mis datos | `rpc borrar_mis_datos`. |

## Mensajes (sección 20.4)

`PERFIL_INCOMPLETO`, `ZONA_DISTINTA`, `VOTO_PROPIO`, `VOTO_REPETIDO` (también el código `23505`), `LIMITE_DIARIO`, `CON_ENLACE`, `MOTIVO_INVALIDO`, `PEDIDO_NO_DISPONIBLE` y `SIN_INTERNET` se traducen a las frases del enunciado. Cualquier otro error muestra «Algo salió mal. Inténtalo otra vez.» y se registra en consola.
