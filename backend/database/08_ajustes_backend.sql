-- =====================================================================
-- 08_ajustes_backend.sql · Proyecto Barrio (app "Vecinos") · Mockup v4
-- Orden de ejecución: 8.º, DESPUÉS de 07_mockup_v4.sql.
-- NO modifica 01 a 05 ni 07: agrega columnas y una tabla, y reemplaza
-- solo preparar_emergencia() y proteger_comunidad().
-- Se puede ejecutar más de una vez. Todo el archivo es una transacción.
--
-- Qué agrega:
--   1. Reportes de comunidad: publicaciones, comentarios y personas
--      (quien pidió ayuda reporta a quien se ofreció).
--      3 vecinos distintos ocultan una publicación o un comentario,
--      igual que ocultar_por_reportes con los negocios.
--   2. Límite de emergencias reales por persona (5 por hora) para que
--      nadie llene de push a los vecinos. El modo práctica no cuenta.
--   3. Marca de "ya avisado" para la Edge Function alerta-vecinos, así
--      no manda el aviso inicial ni el de cierre dos veces.
--
-- Códigos de error nuevos (para errores.ts):
--   LIMITE_EMERGENCIAS       Más de 5 emergencias reales en una hora
--   REPORTE_NO_VALIDO        Reportar a una persona que no te ofreció ayuda
--   COMENTARIO_NO_DISPONIBLE Reportar un comentario oculto o borrado
--   (Reportar una publicación oculta o propia usa PUBLICACION_NO_DISPONIBLE.)
-- =====================================================================

begin;

-- =====================================================================
-- PARTE A. Columnas nuevas
-- =====================================================================

-- Revisión del admin: los reportes anteriores a esta fecha ya no cuentan.
alter table public.publicaciones add column if not exists revisado_en timestamptz;
alter table public.comentarios   add column if not exists revisado_en timestamptz;

-- Marcas de aviso (las escribe solo reclamar_aviso, con service_role).
alter table public.emergencias add column if not exists avisado_en        timestamptz;
alter table public.emergencias add column if not exists cierre_avisado_en timestamptz;


-- =====================================================================
-- PARTE B. Tabla de reportes de comunidad
-- =====================================================================

create table if not exists public.reportes_comunidad (
  id              uuid primary key default gen_random_uuid(),
  vecino_id       uuid not null default auth.uid()
                  references public.perfiles (id) on delete cascade,
  publicacion_id  uuid references public.publicaciones (id) on delete cascade,
  comentario_id   uuid references public.comentarios (id) on delete cascade,
  usuario_id      uuid references public.perfiles (id) on delete cascade,
  motivo          text not null check (motivo in
                    ('abuso', 'spam', 'falso', 'ofensivo', 'otro')),
  creado_en       timestamptz not null default now(),
  -- Un reporte apunta a una sola cosa.
  constraint reportes_comunidad_un_destino
    check (num_nonnulls(publicacion_id, comentario_id, usuario_id) = 1)
);

-- Un reporte por vecino y destino.
create unique index if not exists reportes_com_unico_pub
  on public.reportes_comunidad (vecino_id, publicacion_id) where publicacion_id is not null;
create unique index if not exists reportes_com_unico_com
  on public.reportes_comunidad (vecino_id, comentario_id)  where comentario_id  is not null;
create unique index if not exists reportes_com_unico_usr
  on public.reportes_comunidad (vecino_id, usuario_id)     where usuario_id     is not null;

create index if not exists reportes_com_pub_idx   on public.reportes_comunidad (publicacion_id) where publicacion_id is not null;
create index if not exists reportes_com_com_idx   on public.reportes_comunidad (comentario_id)  where comentario_id  is not null;
create index if not exists reportes_com_usr_idx   on public.reportes_comunidad (usuario_id)     where usuario_id     is not null;
create index if not exists reportes_com_vecino_idx on public.reportes_comunidad (vecino_id, creado_en);


-- =====================================================================
-- PARTE C. Triggers y funciones
-- =====================================================================

-- ---------------------------------------------------------------------
-- Antes de guardar un reporte: perfil completo, no bloqueado, máximo 10
-- por día y destino válido dentro de mi zona. Para reportar a una
-- persona hay que ser quien pidió ayuda y que esa persona se haya
-- ofrecido (ayudas_ofrecidas).
-- ---------------------------------------------------------------------
create or replace function public.preparar_reporte_comunidad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := auth.uid();
  zona uuid;
  z    uuid;
  n    integer;
begin
  if uid is null then
    return new;
  end if;

  if not public.perfil_completo() then
    raise exception 'PERFIL_INCOMPLETO';
  end if;
  if public.esta_bloqueado(uid) then
    raise exception 'BLOQUEADO';
  end if;

  select count(*) into n from public.reportes_comunidad
  where vecino_id = uid and creado_en >= public.inicio_dia_lima();
  if n >= 10 then raise exception 'LIMITE_DIARIO'; end if;

  zona := public.mi_zona();

  if new.publicacion_id is not null then
    select pu.zona_id into z from public.publicaciones pu
    where pu.id = new.publicacion_id and not pu.oculto and pu.autor <> uid;
    if z is null then raise exception 'PUBLICACION_NO_DISPONIBLE'; end if;
    if z is distinct from zona then raise exception 'ZONA_DISTINTA'; end if;

  elsif new.comentario_id is not null then
    select coalesce(pu.zona_id, s.zona_id) into z
    from public.comentarios c
    left join public.publicaciones pu on pu.id = c.publicacion_id
    left join public.servicios s      on s.id  = c.servicio_id
    where c.id = new.comentario_id and not c.oculto and c.autor <> uid;
    if z is null then raise exception 'COMENTARIO_NO_DISPONIBLE'; end if;
    if z is distinct from zona then raise exception 'ZONA_DISTINTA'; end if;

  else
    if new.usuario_id = uid
       or not exists (select 1
                      from public.ayudas_ofrecidas ao
                      join public.pedidos_ayuda pa on pa.id = ao.pedido_id
                      where pa.autor = uid and ao.ayudante_id = new.usuario_id) then
      raise exception 'REPORTE_NO_VALIDO';
    end if;
  end if;

  new.vecino_id := uid;
  new.creado_en := now();
  return new;
end;
$$;
comment on function public.preparar_reporte_comunidad() is
  'security definer: valida zona, destino y límite diario del reporte; no devuelve datos.';

drop trigger if exists preparar_reporte_comunidad on public.reportes_comunidad;
create trigger preparar_reporte_comunidad before insert on public.reportes_comunidad
  for each row execute function public.preparar_reporte_comunidad();

-- ---------------------------------------------------------------------
-- Después de guardar: 3 vecinos distintos (desde la última revisión del
-- admin) ocultan la publicación o el comentario. Los reportes a personas
-- no ocultan nada: los revisa el admin, que decide si bloquea.
-- ---------------------------------------------------------------------
create or replace function public.ocultar_por_reportes_comunidad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if new.publicacion_id is not null then
    select count(distinct r.vecino_id) into n
    from public.reportes_comunidad r
    join public.publicaciones pu on pu.id = r.publicacion_id
    where r.publicacion_id = new.publicacion_id
      and r.creado_en > coalesce(pu.revisado_en, '-infinity'::timestamptz);
    if n >= 3 then
      update public.publicaciones set oculto = true where id = new.publicacion_id;
    end if;

  elsif new.comentario_id is not null then
    select count(distinct r.vecino_id) into n
    from public.reportes_comunidad r
    join public.comentarios c on c.id = r.comentario_id
    where r.comentario_id = new.comentario_id
      and r.creado_en > coalesce(c.revisado_en, '-infinity'::timestamptz);
    if n >= 3 then
      update public.comentarios set oculto = true where id = new.comentario_id;
    end if;
  end if;
  return null;
end;
$$;
comment on function public.ocultar_por_reportes_comunidad() is
  'security definer: el vecino que reporta no puede editar contenido ajeno; la función oculta por él.';

drop trigger if exists ocultar_por_reportes_comunidad on public.reportes_comunidad;
create trigger ocultar_por_reportes_comunidad after insert on public.reportes_comunidad
  for each row execute function public.ocultar_por_reportes_comunidad();

-- ---------------------------------------------------------------------
-- proteger_comunidad (reemplaza la de 07): igual que antes, y además
-- revisado_en solo lo cambia un admin. Cuando un admin vuelve a mostrar
-- algo oculto, revisado_en se pone solo, y los reportes viejos dejan de
-- contar.
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
-- preparar_emergencia (reemplaza la de 07): igual que antes, y además
--   · máximo 5 emergencias REALES por hora (el modo práctica no cuenta);
--   · las marcas de aviso siempre empiezan vacías.
-- ---------------------------------------------------------------------
create or replace function public.preparar_emergencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n   integer;
begin
  if uid is not null then
    new.persona := uid;
  end if;

  if uid is not null and not new.practica then
    select count(*) into n from public.emergencias e
    where e.persona = new.persona and not e.practica
      and e.creado_en > now() - interval '1 hour';
    if n >= 5 then raise exception 'LIMITE_EMERGENCIAS'; end if;
  end if;

  update public.emergencias
  set estado = 'cerrada', cerrada_en = now(),
      nombre = null, direccion = null, lat = null, lng = null
  where persona = new.persona and estado = 'activa';

  new.estado     := 'activa';
  new.creado_en  := now();
  new.expira_en  := now() + interval '2 hours';
  new.cerrada_en := null;
  new.lat_aprox  := round(new.lat, 3);
  new.lng_aprox  := round(new.lng, 3);
  new.avisado_en        := null;
  new.cierre_avisado_en := null;
  -- Modo práctica: nunca avisa a vecinos reales.
  new.avisar_vecinos := not new.practica and coalesce(
    (select p.alerta_vecinal from public.perfiles p where p.id = new.persona), false);

  -- Retención: limpia las vencidas y borra las antiguas aunque no haya pg_cron.
  perform public.limpiar_emergencias_vencidas();
  return new;
end;
$$;
comment on function public.preparar_emergencia() is
  'security definer: limita emergencias reales por hora, cierra las previas del mismo usuario, lee su interruptor de alerta y ejecuta la limpieza de retención.';

-- ---------------------------------------------------------------------
-- reclamar_aviso: para la Edge Function alerta-vecinos (solo
-- service_role). Devuelve true UNA sola vez por emergencia y tipo; si
-- devuelve false, la función no debe enviar nada.
--   'inicio': emergencia real, activa, con aviso a vecinos.
--   'cierre': emergencia cerrada que ya había avisado al inicio.
-- ---------------------------------------------------------------------
create or replace function public.reclamar_aviso(p_emergencia uuid, p_tipo text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_tipo = 'inicio' then
    update public.emergencias
    set avisado_en = now()
    where id = p_emergencia and avisado_en is null
      and avisar_vecinos and not practica
      and estado = 'activa' and expira_en > now();
    return found;
  elsif p_tipo = 'cierre' then
    update public.emergencias
    set cierre_avisado_en = now()
    where id = p_emergencia and cierre_avisado_en is null
      and avisado_en is not null
      and estado = 'cerrada';
    return found;
  end if;
  raise exception 'TIPO_AVISO_INVALIDO';
end;
$$;
comment on function public.reclamar_aviso(uuid, text) is
  'Solo service_role (Edge Function alerta-vecinos): marca el aviso inicial o de cierre una sola vez.';


-- =====================================================================
-- PARTE D. Seguridad por filas y permisos
-- =====================================================================

alter table public.reportes_comunidad enable row level security;

drop policy if exists reportes_com_leer_admin   on public.reportes_comunidad;
drop policy if exists reportes_com_crear        on public.reportes_comunidad;
drop policy if exists reportes_com_borrar_admin on public.reportes_comunidad;
create policy reportes_com_leer_admin   on public.reportes_comunidad for select to authenticated
  using (public.es_admin());
create policy reportes_com_crear        on public.reportes_comunidad for insert to authenticated
  with check (vecino_id = auth.uid() and public.perfil_completo());
create policy reportes_com_borrar_admin on public.reportes_comunidad for delete to authenticated
  using (public.es_admin());

revoke insert, update, delete on public.reportes_comunidad from anon;

revoke execute on function public.preparar_reporte_comunidad()        from public, anon, authenticated;
revoke execute on function public.ocultar_por_reportes_comunidad()    from public, anon, authenticated;
revoke execute on function public.reclamar_aviso(uuid, text)          from public, anon, authenticated;
grant  execute on function public.reclamar_aviso(uuid, text)          to service_role;

commit;
