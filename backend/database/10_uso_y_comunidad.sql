-- =====================================================================
-- 10_uso_y_comunidad.sql · Proyecto Barrio · Informe v2.3
-- Orden de ejecución: 10.º, DESPUÉS de 09_datos_demo.sql.
-- NO modifica 01 a 09: agrega una tabla, una columna y funciones, y
-- reemplaza solo limpiar_emergencias_vencidas() y proteger_comunidad().
-- Se puede ejecutar más de una vez. Todo el archivo es una transacción.
--
-- Qué agrega:
--   A. Tiempo de uso (INC-52): uso_app por zona, fecha y hora, sin
--      usuario. La app llama registrar_uso; solo un admin lo lee.
--      Las filas se borran a los 7 días.
--   B. Lugar del evento en Comunidad (6.4.1): publicaciones.lugar, de
--      hasta 100 caracteres y sin enlaces.
--
-- Códigos de error nuevos (para errores.ts):
--   USO_INVALIDO   registrar_uso con menos de 5 o más de 14400 segundos
--   (Un enlace en lugar usa CON_ENLACE, que ya existía.)
-- =====================================================================

begin;

-- =====================================================================
-- PARTE A. Tiempo de uso
-- =====================================================================

-- uso_app: sin user_id, nombre ni celular. zona_id null = «Sin zona».
create table if not exists public.uso_app (
  id         uuid primary key default gen_random_uuid(),
  zona_id    uuid references public.zonas (id) on delete set null,
  fecha      date not null,
  hora       smallint not null check (hora between 0 and 23),
  segundos   integer not null check (segundos between 5 and 14400),
  creado_en  timestamptz not null default now()
);

create index if not exists uso_app_fecha_idx on public.uso_app (fecha, zona_id);

alter table public.uso_app enable row level security;

-- Solo un admin lee. Nadie escribe directo: la app usa registrar_uso.
drop policy if exists uso_app_leer_admin on public.uso_app;
create policy uso_app_leer_admin on public.uso_app for select to authenticated
  using (public.es_admin());

revoke all on public.uso_app from anon;
revoke insert, update, delete on public.uso_app from authenticated;

-- registrar_uso: guarda la zona de la sesión y la fecha y hora de Lima, nunca quién.
create or replace function public.registrar_uso(p_segundos integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ahora timestamp := now() at time zone 'America/Lima';
begin
  if p_segundos is null or p_segundos < 5 or p_segundos > 14400 then
    raise exception 'USO_INVALIDO';
  end if;

  insert into public.uso_app (zona_id, fecha, hora, segundos)
  values (public.mi_zona(), ahora::date, extract(hour from ahora)::smallint, p_segundos);
end;
$$;
comment on function public.registrar_uso(integer) is
  'security definer: uso_app no tiene política de insert; guarda zona, fecha, hora y segundos, sin quién.';

-- ---------------------------------------------------------------------
-- limpiar_emergencias_vencidas (reemplaza la de 07): igual que antes, y
-- además borra las filas de uso_app con más de 7 días.
-- ---------------------------------------------------------------------
create or replace function public.limpiar_emergencias_vencidas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  -- Permite a validar_cadena dejar pasar estos cambios (solo en esta transacción).
  perform set_config('barrio.limpieza', 'on', true);

  update public.emergencias
  set estado = 'cerrada', cerrada_en = coalesce(cerrada_en, now()),
      nombre = null, direccion = null, lat = null, lng = null
  where (estado = 'activa' and expira_en <= now())
     or (estado = 'cerrada' and (nombre is not null or direccion is not null or lat is not null));
  get diagnostics n = row_count;

  update public.eslabones es set contacto = null
  from public.emergencias e
  where e.id = es.emergencia_id and e.estado = 'cerrada' and es.contacto is not null;

  delete from public.enlaces en
  using public.emergencias e
  where e.id = en.emergencia_id and e.estado = 'cerrada';

  delete from public.emergencias
  where estado = 'cerrada' and cerrada_en < now() - interval '7 days';

  -- Tiempo de uso: se guarda solo 7 días.
  delete from public.uso_app
  where creado_en < now() - interval '7 days';

  perform set_config('barrio.limpieza', 'off', true);
  return n;
end;
$$;
-- Sin «comment on»: create or replace conserva el comentario de 07 (que pasa de 140 caracteres).


-- =====================================================================
-- PARTE B. Lugar del evento en Comunidad
-- =====================================================================

alter table public.publicaciones add column if not exists lugar text;
alter table public.publicaciones drop constraint if exists publicaciones_lugar_largo;
alter table public.publicaciones add constraint publicaciones_lugar_largo
  check (char_length(lugar) <= 100);

-- ---------------------------------------------------------------------
-- proteger_comunidad (reemplaza la de 08): igual que antes, y además
-- un enlace en lugar da CON_ENLACE al editar.
-- ---------------------------------------------------------------------
create or replace function public.proteger_comunidad()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_table_name = 'publicaciones' then
      if public.contiene_enlace(new.mensaje) then raise exception 'CON_ENLACE'; end if;
      if public.contiene_enlace(new.lugar) then raise exception 'CON_ENLACE'; end if;
      new.zona_id := old.zona_id;
    else
      if public.contiene_enlace(new.texto) then raise exception 'CON_ENLACE'; end if;
      new.publicacion_id := old.publicacion_id;
      new.servicio_id    := old.servicio_id;
    end if;
    new.id        := old.id;
    new.autor     := old.autor;
    new.creado_en := old.creado_en;
    if not public.es_admin() then
      new.oculto      := old.oculto;
      new.revisado_en := old.revisado_en;
    elsif old.oculto and not new.oculto then
      new.revisado_en := now();
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- validar_lugar: proteger_comunidad solo corre al editar. Al crear, las
-- publicaciones pasan por limitar_comunidad, que no conoce lugar; este
-- trigger chico rechaza el enlace sin reemplazar limitar_comunidad.
-- ---------------------------------------------------------------------
create or replace function public.validar_lugar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.contiene_enlace(new.lugar) then
    raise exception 'CON_ENLACE';
  end if;
  return new;
end;
$$;

drop trigger if exists validar_lugar on public.publicaciones;
create trigger validar_lugar before insert on public.publicaciones
  for each row execute function public.validar_lugar();


-- =====================================================================
-- PARTE C. Permisos
-- =====================================================================

revoke execute on function public.registrar_uso(integer)              from public, anon;
grant  execute on function public.registrar_uso(integer)              to authenticated;

-- Igual que en 07: la limpieza solo la ejecuta service_role (y las funciones que la llaman).
revoke execute on function public.limpiar_emergencias_vencidas()      from public, anon, authenticated;
grant  execute on function public.limpiar_emergencias_vencidas()      to service_role;

revoke execute on function public.proteger_comunidad()                from public, anon, authenticated;
revoke execute on function public.validar_lugar()                     from public, anon, authenticated;


-- =====================================================================
-- PARTE D. Verificación
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'uso_app' and c.relrowsecurity
  ) then
    raise exception 'RLS apagado en uso_app';
  end if;
end;
$$;

commit;
