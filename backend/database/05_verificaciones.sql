-- 05_verificaciones.sql
-- Orden: 5 de 6. Se ejecuta después de 04_datos_prueba.sql.
-- Falla si alguna tabla del módulo tiene RLS apagado o si admins tiene políticas para la app.

do $$
declare
  sin_rls text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
  into sin_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in (
      'zonas', 'perfiles', 'admins', 'servicios', 'vistos_buenos',
      'reportes', 'grupos_apoyo', 'pedidos_ayuda', 'ayudas_ofrecidas'
    )
    and not c.relrowsecurity;

  if sin_rls is not null then
    raise exception 'RLS apagado en: %', sin_rls;
  end if;

  if (
    select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'zonas', 'perfiles', 'admins', 'servicios', 'vistos_buenos',
        'reportes', 'grupos_apoyo', 'pedidos_ayuda', 'ayudas_ofrecidas'
      )
  ) < 9 then
    raise exception 'Falta alguna tabla del módulo';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admins'
      and roles && array['anon', 'authenticated']::name[]
  ) then
    raise exception 'admins tiene políticas para anon o authenticated';
  end if;
end $$;
