-- 06_mantenimiento.sql
-- Orden: 6 de 6. No forma parte de la carga 01 a 05.
-- ADVERTENCIA: ejecución manual en el SQL Editor.
-- Borra solo usuarios anónimos SIN perfil y con más de 7 días.
-- No borra por antigüedad sola: una cuenta anónima con perfil se conserva.

delete from auth.users usuario
where coalesce(usuario.is_anonymous, false) = true
  and usuario.created_at < now() - interval '7 days'
  and not exists (
    select 1 from public.perfiles perfil where perfil.id = usuario.id
  );
