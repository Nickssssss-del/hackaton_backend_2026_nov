-- 02_funciones.sql · Proyecto Barrio (app "Vecinos") · Módulo 1
-- Orden de ejecución: 2.º (después de 01_tablas.sql)
-- Funciones auxiliares, triggers, funciones RPC y vistas.
-- Los rechazos usan códigos fijos (sección 20.4).

create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
comment on function public.es_admin() is
  'security definer: la tabla admins no tiene políticas para la app; esta función solo responde sí o no para el usuario de la sesión.';

create or replace function public.perfil_completo()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.nombre is not null
      and p.celular is not null
      and p.zona_id is not null
  );
$$;
comment on function public.perfil_completo() is
  'security definer: se usa dentro de políticas RLS; solo mira la fila del propio usuario.';

create or replace function public.contiene_enlace(texto text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select coalesce(
    texto ~* '(https?://|www\.|[a-z0-9-]+\.(com|pe|net|org|info|io|ly|me|app|link|xyz|site|online|shop|store|co|es)(/|\s|$))',
    false);
$$;

create or replace function public.nombre_corto(nombre text)
returns text
language sql immutable
set search_path = ''
as $$
  select case
    when nombre is null or btrim(nombre) = '' then null
    when split_part(btrim(nombre), ' ', 2) = '' then btrim(nombre)
    else split_part(btrim(nombre), ' ', 1) || ' '
         || upper(left(split_part(regexp_replace(btrim(nombre), '\s+', ' ', 'g'), ' ', 2), 1)) || '.'
  end;
$$;

create or replace function public.distancia_m(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns double precision
language sql immutable
set search_path = ''
as $$
  select case when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
  else 2 * 6371000 * asin(sqrt(
         power(sin(radians((lat2 - lat1)::float8) / 2), 2)
       + cos(radians(lat1::float8)) * cos(radians(lat2::float8))
       * power(sin(radians((lng2 - lng1)::float8) / 2), 2)))
  end;
$$;

create or replace function public.inicio_dia_lima()
returns timestamptz
language sql stable
set search_path = ''
as $$
  select (date_trunc('day', now() at time zone 'America/Lima')) at time zone 'America/Lima';
$$;

create or replace function public.esta_abierto(apertura time, cierre time)
returns boolean
language sql stable
set search_path = ''
as $$
  select case
    when apertura is null or cierre is null then null
    when apertura = cierre then true
    when apertura < cierre then
      (now() at time zone 'America/Lima')::time >= apertura
      and (now() at time zone 'America/Lima')::time < cierre
    else
      (now() at time zone 'America/Lima')::time >= apertura
      or (now() at time zone 'America/Lima')::time < cierre
  end;
$$;

create or replace function public.validar_zona_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  z record;
begin
  if new.zona_id is not null and new.lat is not null and new.lng is not null then
    select lat_centro, lng_centro, radio_m into z
    from public.zonas where id = new.zona_id;
    if found and public.distancia_m(new.lat, new.lng, z.lat_centro, z.lng_centro) > z.radio_m + 150 then
      raise exception 'ZONA_DISTINTA';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validar_zona_perfil on public.perfiles;
create trigger validar_zona_perfil
  before insert or update of zona_id, lat, lng on public.perfiles
  for each row execute function public.validar_zona_perfil();

create or replace function public.proteger_verificacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.celular_verificado  := false;
      new.cuenta_asegurada_en := null;
      new.creado_en           := now();
    else
      new.id                  := old.id;
      new.creado_en           := old.creado_en;
      new.cuenta_asegurada_en := old.cuenta_asegurada_en;
      if new.celular is distinct from old.celular then
        new.celular_verificado := false;
      else
        new.celular_verificado := old.celular_verificado;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_verificacion on public.perfiles;
create trigger proteger_verificacion
  before insert or update on public.perfiles
  for each row execute function public.proteger_verificacion();

create or replace function public.limitar_publicaciones()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  zona  uuid;
  n     integer;
begin
  if uid is null then
    return new;
  end if;

  if not public.perfil_completo() then
    raise exception 'PERFIL_INCOMPLETO';
  end if;

  select p.zona_id into zona from public.perfiles p where p.id = uid;

  if tg_table_name = 'servicios' then
    if public.contiene_enlace(new.descripcion)
       or public.contiene_enlace(new.nombre_negocio)
       or public.contiene_enlace(new.direccion) then
      raise exception 'CON_ENLACE';
    end if;

    select count(*) into n from public.servicios
    where autor = uid and creado_en >= public.inicio_dia_lima();
    if n >= 3 then raise exception 'LIMITE_DIARIO'; end if;

    select count(*) into n from public.servicios
    where autor = uid and not oculto;
    if n >= 5 then raise exception 'LIMITE_DIARIO'; end if;

    new.autor       := uid;
    new.zona_id     := zona;
    new.oculto      := false;
    new.revisado_en := null;
    new.creado_en   := now();

  elsif tg_table_name = 'pedidos_ayuda' then
    if public.contiene_enlace(new.descripcion) then
      raise exception 'CON_ENLACE';
    end if;

    select count(*) into n from public.pedidos_ayuda
    where autor = uid and estado = 'abierto' and expira_en > now();
    if n >= 2 then raise exception 'LIMITE_DIARIO'; end if;

    new.autor     := uid;
    new.zona_id   := zona;
    new.estado    := 'abierto';
    new.creado_en := now();
    new.expira_en := now() + interval '48 hours';

  elsif tg_table_name = 'reportes' then
    select count(*) into n from public.reportes
    where vecino_id = uid and creado_en >= public.inicio_dia_lima();
    if n >= 5 then raise exception 'LIMITE_DIARIO'; end if;

    new.vecino_id := uid;
    new.creado_en := now();
  end if;

  return new;
end;
$$;
comment on function public.limitar_publicaciones() is
  'security definer: necesita contar filas del propio usuario y leer su perfil; no devuelve datos.';

drop trigger if exists limitar_publicaciones on public.servicios;
create trigger limitar_publicaciones
  before insert on public.servicios
  for each row execute function public.limitar_publicaciones();

drop trigger if exists limitar_publicaciones on public.pedidos_ayuda;
create trigger limitar_publicaciones
  before insert on public.pedidos_ayuda
  for each row execute function public.limitar_publicaciones();

drop trigger if exists limitar_publicaciones on public.reportes;
create trigger limitar_publicaciones
  before insert on public.reportes
  for each row execute function public.limitar_publicaciones();

create or replace function public.proteger_servicio()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if public.contiene_enlace(new.descripcion)
       or public.contiene_enlace(new.nombre_negocio)
       or public.contiene_enlace(new.direccion) then
      raise exception 'CON_ENLACE';
    end if;
    new.id        := old.id;
    new.autor     := old.autor;
    new.zona_id   := old.zona_id;
    new.creado_en := old.creado_en;
    if not public.es_admin() then
      new.oculto      := old.oculto;
      new.revisado_en := old.revisado_en;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_servicio on public.servicios;
create trigger proteger_servicio
  before update on public.servicios
  for each row execute function public.proteger_servicio();

create or replace function public.proteger_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if public.contiene_enlace(new.descripcion) then
      raise exception 'CON_ENLACE';
    end if;
    new.id        := old.id;
    new.autor     := old.autor;
    new.zona_id   := old.zona_id;
    new.categoria := old.categoria;
    new.creado_en := old.creado_en;
    new.expira_en := old.expira_en;
    if new.estado is distinct from old.estado and old.estado <> 'abierto' then
      raise exception 'PEDIDO_NO_DISPONIBLE';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_pedido on public.pedidos_ayuda;
create trigger proteger_pedido
  before update on public.pedidos_ayuda
  for each row execute function public.proteger_pedido();

create or replace function public.validar_voto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid       uuid := auth.uid();
  srv       record;
  mi_zona   uuid;
  n         integer;
begin
  if uid is null then
    return new;
  end if;

  if not public.perfil_completo() then
    raise exception 'PERFIL_INCOMPLETO';
  end if;

  if new.motivo is null or new.motivo not in
     ('trato_amable', 'buen_precio', 'confiable', 'viene_domicilio') then
    raise exception 'MOTIVO_INVALIDO';
  end if;

  if public.contiene_enlace(new.comentario) then
    raise exception 'CON_ENLACE';
  end if;

  select s.autor, s.zona_id, s.oculto into srv
  from public.servicios s where s.id = new.servicio_id;
  if not found or srv.oculto then
    raise exception 'SERVICIO_NO_DISPONIBLE';
  end if;

  if srv.autor = uid then
    raise exception 'VOTO_PROPIO';
  end if;

  select p.zona_id into mi_zona from public.perfiles p where p.id = uid;
  if mi_zona is distinct from srv.zona_id then
    raise exception 'ZONA_DISTINTA';
  end if;

  if exists (select 1 from public.vistos_buenos v
             where v.servicio_id = new.servicio_id and v.vecino_id = uid) then
    raise exception 'VOTO_REPETIDO';
  end if;

  select count(*) into n from public.vistos_buenos
  where vecino_id = uid and creado_en >= public.inicio_dia_lima();
  if n >= 10 then
    raise exception 'LIMITE_DIARIO';
  end if;

  new.vecino_id := uid;
  new.creado_en := now();
  if new.comentario is null or btrim(new.comentario) = '' then
    new.comentario := null;
    new.mostrar_comentario := false;
  end if;
  return new;
end;
$$;
comment on function public.validar_voto() is
  'security definer: debe leer el servicio (tabla privada del autor) para validar zona y voto propio; no devuelve datos.';

drop trigger if exists validar_voto on public.vistos_buenos;
create trigger validar_voto
  before insert on public.vistos_buenos
  for each row execute function public.validar_voto();

create or replace function public.ocultar_por_reportes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  select count(distinct r.vecino_id) into n
  from public.reportes r
  join public.servicios s on s.id = r.servicio_id
  where r.servicio_id = new.servicio_id
    and r.creado_en > coalesce(s.revisado_en, '-infinity'::timestamptz);

  if n >= 3 then
    update public.servicios set oculto = true where id = new.servicio_id;
  end if;
  return null;
end;
$$;
comment on function public.ocultar_por_reportes() is
  'security definer: el vecino que reporta no puede editar servicios ajenos; la función oculta el servicio por él.';

drop trigger if exists ocultar_por_reportes on public.reportes;
create trigger ocultar_por_reportes
  after insert on public.reportes
  for each row execute function public.ocultar_por_reportes();

create or replace function public.yo_ayudo(p_pedido_id uuid)
returns table (nombre text, celular text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  ped      record;
  mi_zona  uuid;
begin
  if uid is null or not public.perfil_completo() then
    raise exception 'PERFIL_INCOMPLETO';
  end if;

  select pa.autor, pa.zona_id, pa.estado, pa.expira_en into ped
  from public.pedidos_ayuda pa where pa.id = p_pedido_id;

  if not found or ped.estado <> 'abierto' or ped.expira_en <= now() or ped.autor = uid then
    raise exception 'PEDIDO_NO_DISPONIBLE';
  end if;

  select p.zona_id into mi_zona from public.perfiles p where p.id = uid;
  if mi_zona is distinct from ped.zona_id then
    raise exception 'ZONA_DISTINTA';
  end if;

  insert into public.ayudas_ofrecidas (pedido_id, ayudante_id)
  values (p_pedido_id, uid)
  on conflict (pedido_id, ayudante_id) do nothing;

  return query
    select p.nombre, p.celular from public.perfiles p where p.id = ped.autor;
end;
$$;
comment on function public.yo_ayudo(uuid) is
  'security definer: entrega el celular de quien pidió solo después de validar perfil, zona y vigencia, y deja registro del ayudante.';

create or replace function public.borrar_mis_datos()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'PERFIL_INCOMPLETO';
  end if;
  delete from public.perfiles where id = auth.uid();
end;
$$;
comment on function public.borrar_mis_datos() is
  'security definer: la app no tiene política de borrado directo en perfiles; solo borra la fila del usuario de la sesión.';

create or replace function public.estado_cuenta()
returns table (protegida boolean, celular_verificado boolean)
language sql stable security definer
set search_path = ''
as $$
  select
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false,
    coalesce((select p.celular_verificado from public.perfiles p where p.id = auth.uid()), false);
$$;
comment on function public.estado_cuenta() is
  'Fuera del MVP. security definer: solo lee la fila propia.';

create or replace function public.sincronizar_verificacion()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  tel   text;
  anon  boolean;
  ok    boolean;
begin
  if auth.uid() is null then
    raise exception 'PERFIL_INCOMPLETO';
  end if;

  select u.phone, coalesce(u.is_anonymous, true) into tel, anon
  from auth.users u
  where u.id = auth.uid() and u.phone_confirmed_at is not null;

  update public.perfiles p
  set celular_verificado  = (tel is not null and tel = '51' || p.celular),
      cuenta_asegurada_en = case when coalesce(anon, true) = false
                                 then coalesce(p.cuenta_asegurada_en, now())
                                 else p.cuenta_asegurada_en end
  where p.id = auth.uid()
  returning p.celular_verificado into ok;

  return coalesce(ok, false);
end;
$$;
comment on function public.sincronizar_verificacion() is
  'Fuera del MVP. security definer: necesita leer auth.users (la app nunca lo lee) y escribir columnas protegidas; search_path fijo.';

drop view if exists public.servicios_publicos;
create view public.servicios_publicos
with (security_invoker = false)
as
select
  s.id,
  coalesce(s.nombre_negocio, public.nombre_corto(au.nombre))        as nombre,
  s.nombre_negocio,
  s.oficio,
  s.descripcion,
  s.precio_desde,
  s.hora_apertura,
  s.hora_cierre,
  public.esta_abierto(s.hora_apertura, s.hora_cierre)               as abierto_ahora,
  s.zona_id,
  z.nombre                                                          as zona_nombre,
  s.lat,
  s.lng,
  case when s.mostrar_direccion then s.direccion end                as direccion,
  case when s.mostrar_telefono  then s.contacto  end                as contacto,
  s.disponible_emergencia,
  coalesce(v.total, 0)                                              as vistos_buenos_total,
  coalesce(v.cerca_300m, 0)                                         as vistos_buenos_300m,
  coalesce(v.trato_amable, 0)                                       as votos_trato_amable,
  coalesce(v.buen_precio, 0)                                        as votos_buen_precio,
  coalesce(v.confiable, 0)                                          as votos_confiable,
  coalesce(v.viene_domicilio, 0)                                    as votos_viene_domicilio,
  cd.comentario                                                     as comentario_destacado,
  cd.autor_corto                                                    as comentario_autor,
  cd.creado_en                                                      as comentario_fecha,
  (s.autor = auth.uid())                                            as es_mio,
  s.creado_en
from public.servicios s
join public.perfiles au on au.id = s.autor
join public.zonas z     on z.id  = s.zona_id
left join lateral (
  select
    count(*)::int                                                   as total,
    count(*) filter (where public.distancia_m(pv.lat, pv.lng, s.lat, s.lng) <= 300)::int as cerca_300m,
    count(*) filter (where vb.motivo = 'trato_amable')::int         as trato_amable,
    count(*) filter (where vb.motivo = 'buen_precio')::int          as buen_precio,
    count(*) filter (where vb.motivo = 'confiable')::int            as confiable,
    count(*) filter (where vb.motivo = 'viene_domicilio')::int      as viene_domicilio
  from public.vistos_buenos vb
  join public.perfiles pv on pv.id = vb.vecino_id
  where vb.servicio_id = s.id
) v on true
left join lateral (
  select vb.comentario, public.nombre_corto(pv.nombre) as autor_corto, vb.creado_en
  from public.vistos_buenos vb
  join public.perfiles pv on pv.id = vb.vecino_id
  where vb.servicio_id = s.id
    and vb.mostrar_comentario
    and vb.comentario is not null
  order by vb.creado_en desc
  limit 1
) cd on true
where not s.oculto;

comment on view public.servicios_publicos is
  'Vista security definer a propósito: cuenta votos y lee el nombre corto del autor sin abrir las tablas servicios, vistos_buenos ni perfiles. Solo entrega teléfono y dirección si el proveedor dio permiso, y nunca servicios ocultos.';

drop view if exists public.pedidos_cercanos;
create view public.pedidos_cercanos
with (security_invoker = false)
as
select
  pa.id,
  public.nombre_corto(p.nombre)                                     as nombre_corto,
  pa.categoria,
  pa.descripcion,
  pa.zona_id,
  pa.creado_en,
  pa.expira_en,
  (extract(epoch from (now() - pa.creado_en)) / 60)::int            as minutos_antiguedad,
  (pa.autor = auth.uid())                                           as es_mio,
  exists (select 1 from public.ayudas_ofrecidas ao
          where ao.pedido_id = pa.id and ao.ayudante_id = auth.uid()) as ya_ofreci
from public.pedidos_ayuda pa
join public.perfiles p on p.id = pa.autor
where pa.estado = 'abierto'
  and pa.expira_en > now()
  and pa.zona_id = (select pz.zona_id from public.perfiles pz where pz.id = auth.uid());

comment on view public.pedidos_cercanos is
  'Vista security definer a propósito: muestra pedidos vigentes solo de la zona de quien consulta, con nombre corto, sin teléfono ni coordenadas. Sin sesión no devuelve filas.';

revoke execute on function public.es_admin()                 from public, anon;
revoke execute on function public.perfil_completo()          from public, anon;
revoke execute on function public.yo_ayudo(uuid)             from public, anon;
revoke execute on function public.borrar_mis_datos()         from public, anon;
revoke execute on function public.estado_cuenta()            from public, anon;
revoke execute on function public.sincronizar_verificacion() from public, anon;
revoke execute on function public.validar_zona_perfil()      from public, anon, authenticated;
revoke execute on function public.proteger_verificacion()    from public, anon, authenticated;
revoke execute on function public.limitar_publicaciones()    from public, anon, authenticated;
revoke execute on function public.proteger_servicio()        from public, anon, authenticated;
revoke execute on function public.proteger_pedido()          from public, anon, authenticated;
revoke execute on function public.validar_voto()             from public, anon, authenticated;
revoke execute on function public.ocultar_por_reportes()     from public, anon, authenticated;

grant execute on function public.es_admin()                 to authenticated;
grant execute on function public.perfil_completo()          to authenticated;
grant execute on function public.yo_ayudo(uuid)             to authenticated;
grant execute on function public.borrar_mis_datos()         to authenticated;
grant execute on function public.estado_cuenta()            to authenticated;
grant execute on function public.sincronizar_verificacion() to authenticated;

grant execute on function public.nombre_corto(text)                              to anon, authenticated;
grant execute on function public.distancia_m(numeric, numeric, numeric, numeric) to anon, authenticated;
grant execute on function public.esta_abierto(time, time)                        to anon, authenticated;
grant execute on function public.contiene_enlace(text)                           to anon, authenticated;
grant execute on function public.inicio_dia_lima()                               to anon, authenticated;

grant select on public.servicios_publicos to anon, authenticated;
grant select on public.pedidos_cercanos   to authenticated;
revoke all   on public.pedidos_cercanos   from anon;
