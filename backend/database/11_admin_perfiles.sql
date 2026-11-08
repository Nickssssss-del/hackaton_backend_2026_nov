-- =====================================================================
-- 11_admin_perfiles.sql · Proyecto Barrio (app "Vecinos") · Informe v2.3
-- Orden de ejecución: 11.º, DESPUÉS de 10_uso_y_comunidad.sql.
-- Lo ejecuta Karla en el SQL Editor de Supabase, después del respaldo
-- de la base (INC-54).
-- Se puede ejecutar más de una vez. Todo el archivo es una transacción.
--
-- Qué hace (INC-53):
--   Agrega una política de lectura para que un admin lea public.perfiles.
--   No toca perfiles_leer_propio, perfiles_crear_propio ni
--   perfiles_editar_propio: un vecino sigue leyendo solo su propia fila.
--
-- La política da acceso a la fila completa (nombre, celular y zona
-- aproximada), no solo al nombre. Por eso el panel pide solo id y nombre.
-- =====================================================================

begin;

-- Lectura de perfiles para el admin. Las políticas de select se suman:
-- el vecino entra por perfiles_leer_propio (id = auth.uid()) y el admin
-- por esta. No reemplaza ni borra las políticas que ya existen.
drop policy if exists perfiles_leer_admin on public.perfiles;
create policy perfiles_leer_admin on public.perfiles
  for select to authenticated
  using (public.es_admin());

commit;
