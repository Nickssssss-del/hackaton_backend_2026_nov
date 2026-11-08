-- =====================================================================
-- 12_admin_grupos.sql · Proyecto Barrio (app "Vecinos") · Informe v2.3
-- Orden de ejecución: 12.º, DESPUÉS de 11_admin_perfiles.sql.
-- NO modifica 01 a 11. No toca grupos_leer ni grupos_admin.
-- Se puede ejecutar más de una vez. Todo el archivo es una transacción.
-- Lo ejecuta Karla en el SQL Editor de Supabase.
--
-- Qué hace:
--   El admin puede crear, editar y borrar grupos de apoyo (es_admin()).
--   Un vecino sigue sin poder escribir. La lectura pública no cambia.
-- =====================================================================

begin;

drop policy if exists grupos_crear_admin on public.grupos_apoyo;
create policy grupos_crear_admin on public.grupos_apoyo
  for insert to authenticated
  with check (public.es_admin());

drop policy if exists grupos_editar_admin on public.grupos_apoyo;
create policy grupos_editar_admin on public.grupos_apoyo
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

drop policy if exists grupos_borrar_admin on public.grupos_apoyo;
create policy grupos_borrar_admin on public.grupos_apoyo
  for delete to authenticated
  using (public.es_admin());

commit;
