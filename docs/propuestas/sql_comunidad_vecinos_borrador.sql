-- ============================================================================
-- sql_comunidad_vecinos_borrador.sql · Proyecto Barrio (app "Vecinos")
-- ESTADO: BORRADOR PARA REVISIÓN. NO EJECUTADO. NO ES UNA MIGRACIÓN APLICADA.
-- Ninguna de las tablas, vistas o funciones de este archivo existe todavía en
-- Supabase. Debe revisarlo y aprobarlo la responsable del backend.
--
-- Fecha: 2026-11-07 · Autor: equipo frontend (con asistencia de IA)
-- Basado en: backend/database/01_tablas.sql, 02_funciones.sql y 03_politicas.sql
--            (rama feature/implementacion-frontend, commit 08dce8f)
-- Origen funcional: Mockup v4 (F1 Ayuda entre vecinos, F2 Comunidad, F3 Nueva
--                   publicación) y decisiones del equipo del 7-nov-2026.
--
-- Requisitos previos: scripts 01, 02 y 03 ya ejecutados (usa es_admin(),
-- perfil_completo(), contiene_enlace(), nombre_corto(), inicio_dia_lima()).
-- Si se aprueba, se propone guardarlo como backend/database/07_comunidad.sql
-- (después de 06; no cambia el orden 01–05 de la regla 10 de AGENTS.md).
--
-- Respeta las reglas de backend/AGENTS.md: solo Supabase, RLS en todas las
-- tablas, sin Realtime, sin PostGIS, textos ≤ 140 caracteres y sin enlaces,
-- cada vista security definer con su comentario, la app solo lee vistas.
--
-- Todo el archivo es una transacción: si algo falla, no se aplica nada.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Categorías de ayuda: agregar solo «Desastre natural»
-- ----------------------------------------------------------------------------
-- Hoy (01_tablas.sql) pedidos_ayuda.categoria acepta:
--   'arreglos', 'compras', 'transporte', 'salud'
-- El Mockup v4 (F1) muestra: Desastre natural · Salud · Compras · Apoyo.
--
-- Decisión del equipo (7-nov-2026):
--   «Desastre natural» → valor NUEVO 'desastre_natural' (sismo o lluvia).
--   «Apoyo» (antes «Compañía» en el mockup; «una manito») → se guarda como
--     'transporte', que YA EXISTE. No se crea ningún valor 'apoyo'.
--   Salud → 'salud' y Compras → 'compras' (ya existen).
-- Se conservan los cuatro valores actuales para no romper pedidos existentes.
--
-- La restricción se creó en línea dentro de create table, así que Postgres la
-- llamó pedidos_ayuda_categoria_check. Antes de ejecutar, confirmar el nombre:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.pedidos_ayuda'::regclass and contype = 'c';

alter table public.pedidos_ayuda
  drop constraint if exists pedidos_ayuda_categoria_check;

alter table public.pedidos_ayuda
  add constraint pedidos_ayuda_categoria_check
  check (categoria in (
    'arreglos', 'compras', 'transporte', 'salud',   -- existentes
    'desastre_natural'                               -- nueva (Mockup v4)
  ));

-- Nada más cambia: limitar_publicaciones(), proteger_pedido(), yo_ayudo() y la
-- vista pedidos_cercanos no dependen de la lista de categorías.


-- ----------------------------------------------------------------------------
-- 2. Tabla publicaciones (Comunidad, F2/F3) — primera versión SOLO TEXTO
-- ----------------------------------------------------------------------------
-- Nombre "publicaciones" tomado de la matriz técnica del Mockup v4
-- ("Tabla nueva: publicaciones"). Misma convención que pedidos_ayuda:
-- autor = auth.uid() → perfiles(id); zona del autor; la app no lee la tabla
-- directamente, solo la vista publicaciones_cercanas (sección 4).
-- Fotos: fuera de esta versión (ver la columna comentada al final).

create table if not exists public.publicaciones (
  id          uuid primary key default gen_random_uuid(),
  autor       uuid not null default auth.uid()
              references public.perfiles (id) on delete cascade,
  zona_id     uuid not null references public.zonas (id),
  categoria   text not null check (categoria in
                ('kermes', 'misa', 'donacion', 'ayuda_social', 'taller', 'otro')),
  mensaje     text not null check (char_length(btrim(mensaje)) between 1 and 140),
  oculto      boolean not null default false,
  creado_en   timestamptz not null default now()
  -- foto_ruta text check (char_length(foto_ruta) <= 200)  -- FASE FOTOS: ruta en Storage
);

create index if not exists publicaciones_zona_idx
  on public.publicaciones (zona_id, creado_en desc) where not oculto;
create index if not exists publicaciones_autor_idx
  on public.publicaciones (autor, creado_en);


-- ----------------------------------------------------------------------------
-- 3. Tabla asistencias (botón «Voy» de F2)
-- ----------------------------------------------------------------------------
-- Una sola marca por vecino y publicación (mismo patrón que vistos_buenos).
-- Se puede retirar (delete propio). Si el equipo decide dejar «Voy» para
-- después, esta sección y su parte de la vista se pueden quitar sin afectar
-- a la tabla publicaciones.

create table if not exists public.asistencias (
  id              uuid primary key default gen_random_uuid(),
  publicacion_id  uuid not null references public.publicaciones (id) on delete cascade,
  vecino_id       uuid not null default auth.uid()
                  references public.perfiles (id) on delete cascade,
  creado_en       timestamptz not null default now(),
  constraint asistencias_unico unique (publicacion_id, vecino_id)
);

create index if not exists asistencias_vecino_idx on public.asistencias (vecino_id);


-- ----------------------------------------------------------------------------
-- 4. Funciones de validación (triggers) y vista de lectura
-- ----------------------------------------------------------------------------
-- Códigos de rechazo: se reutilizan los existentes (PERFIL_INCOMPLETO,
-- CON_ENLACE, LIMITE_DIARIO, ZONA_DISTINTA) y se agrega uno nuevo:
--   PUBLICACION_NO_DISPONIBLE (la app debe traducirlo).
-- Se crean funciones nuevas en lugar de modificar limitar_publicaciones()
-- para no tocar código ya probado por backend/pruebas/rls.test.mjs.

create or replace function public.validar_publicacion()
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

  if public.contiene_enlace(new.mensaje) then
    raise exception 'CON_ENLACE';
  end if;

  -- Límite propuesto: 3 publicaciones por día (hora de Lima). A confirmar.
  select count(*) into n from public.publicaciones
  where autor = uid and creado_en >= public.inicio_dia_lima();
  if n >= 3 then
    raise exception 'LIMITE_DIARIO';
  end if;

  select p.zona_id into zona from public.perfiles p where p.id = uid;

  new.autor     := uid;
  new.zona_id   := zona;
  new.mensaje   := btrim(new.mensaje);
  new.oculto    := false;
  new.creado_en := now();
  return new;
end;
$$;
comment on function public.validar_publicacion() is
  'security definer: cuenta las publicaciones del propio usuario y lee su zona; no devuelve datos.';

drop trigger if exists validar_publicacion on public.publicaciones;
create trigger validar_publicacion
  before insert on public.publicaciones
  for each row execute function public.validar_publicacion();

-- Solo el admin puede editar (para ocultar). Si un vecino llegara a tener
-- permiso de update en el futuro, el autor, la zona y la fecha no cambian.
create or replace function public.proteger_publicacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if public.contiene_enlace(new.mensaje) then
      raise exception 'CON_ENLACE';
    end if;
    new.id        := old.id;
    new.autor     := old.autor;
    new.zona_id   := old.zona_id;
    new.creado_en := old.creado_en;
    if not public.es_admin() then
      new.oculto := old.oculto;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_publicacion on public.publicaciones;
create trigger proteger_publicacion
  before update on public.publicaciones
  for each row execute function public.proteger_publicacion();

create or replace function public.validar_asistencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  pub      record;
  mi_zona  uuid;
begin
  if uid is null then
    return new;
  end if;

  if not public.perfil_completo() then
    raise exception 'PERFIL_INCOMPLETO';
  end if;

  select p.zona_id, p.oculto into pub
  from public.publicaciones p where p.id = new.publicacion_id;
  if not found or pub.oculto then
    raise exception 'PUBLICACION_NO_DISPONIBLE';
  end if;

  select pf.zona_id into mi_zona from public.perfiles pf where pf.id = uid;
  if mi_zona is distinct from pub.zona_id then
    raise exception 'ZONA_DISTINTA';
  end if;

  new.vecino_id := uid;
  new.creado_en := now();
  return new;
end;
$$;
comment on function public.validar_asistencia() is
  'security definer: lee la publicación (tabla sin lectura para la app) para validar zona y que no esté oculta; no devuelve datos.';

drop trigger if exists validar_asistencia on public.asistencias;
create trigger validar_asistencia
  before insert on public.asistencias
  for each row execute function public.validar_asistencia();

-- Vista de lectura para la app (mismo patrón que pedidos_cercanos).
drop view if exists public.publicaciones_cercanas;
create view public.publicaciones_cercanas
with (security_invoker = false)
as
select
  pu.id,
  public.nombre_corto(p.nombre)                                     as autor_corto,
  pu.categoria,
  pu.mensaje,
  pu.zona_id,
  pu.creado_en,
  (extract(epoch from (now() - pu.creado_en)) / 60)::int            as minutos_antiguedad,
  (select count(*)::int from public.asistencias a
    where a.publicacion_id = pu.id)                                 as asistentes,
  exists (select 1 from public.asistencias a
          where a.publicacion_id = pu.id and a.vecino_id = auth.uid()) as voy,
  (pu.autor = auth.uid())                                           as es_mio
from public.publicaciones pu
join public.perfiles p on p.id = pu.autor
where not pu.oculto
  and pu.zona_id = (select pz.zona_id from public.perfiles pz where pz.id = auth.uid());

comment on view public.publicaciones_cercanas is
  'Vista security definer a propósito: muestra publicaciones visibles solo de la zona de quien consulta, con nombre corto del autor, número de asistentes y si yo voy, sin abrir las tablas publicaciones, asistencias ni perfiles. Sin sesión no devuelve filas.';


-- ----------------------------------------------------------------------------
-- 5. RLS y permisos
-- ----------------------------------------------------------------------------
alter table public.publicaciones enable row level security;
alter table public.asistencias   enable row level security;

revoke insert, update, delete on public.publicaciones from anon;
revoke insert, update, delete on public.asistencias   from anon;

drop policy if exists publicaciones_leer         on public.publicaciones;
drop policy if exists publicaciones_crear        on public.publicaciones;
drop policy if exists publicaciones_editar_admin on public.publicaciones;
drop policy if exists publicaciones_borrar       on public.publicaciones;
create policy publicaciones_leer  on public.publicaciones for select to authenticated
  using (autor = auth.uid() or public.es_admin());
create policy publicaciones_crear on public.publicaciones for insert to authenticated
  with check (autor = auth.uid() and public.perfil_completo());
create policy publicaciones_editar_admin on public.publicaciones for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy publicaciones_borrar on public.publicaciones for delete to authenticated
  using (autor = auth.uid() or public.es_admin());

drop policy if exists asistencias_leer    on public.asistencias;
drop policy if exists asistencias_crear   on public.asistencias;
drop policy if exists asistencias_retirar on public.asistencias;
create policy asistencias_leer    on public.asistencias for select to authenticated
  using (vecino_id = auth.uid() or public.es_admin());
create policy asistencias_crear   on public.asistencias for insert to authenticated
  with check (vecino_id = auth.uid() and public.perfil_completo());
create policy asistencias_retirar on public.asistencias for delete to authenticated
  using (vecino_id = auth.uid() or public.es_admin());

revoke execute on function public.validar_publicacion()  from public, anon, authenticated;
revoke execute on function public.proteger_publicacion() from public, anon, authenticated;
revoke execute on function public.validar_asistencia()   from public, anon, authenticated;

grant  select on public.publicaciones_cercanas to authenticated;
revoke all    on public.publicaciones_cercanas from anon;


-- ----------------------------------------------------------------------------
-- 6. Categoría de servicio «Agua y luz» (E1) → oficio 'pago_servicios'
-- ----------------------------------------------------------------------------
-- El Mockup v4 (E1) muestra «Agua y luz» (lugares donde pagar recibos; la app
-- no procesa pagos). No existe en servicios.oficio. Las demás categorías de
-- E1/E4 ya tienen oficio:
--   Bodegas → bodega · Panaderías → panaderia · Farmacias → farmacia
--   Menú del día / Menú → restaurante · Gasfitero → gasfitero · Otro → otro
--   Oficios → grupo de varios oficios (electricista, carpintero, …), solo en la app
-- Igual que en la sección 1, confirmar antes el nombre de la restricción:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'public.servicios'::regclass and contype = 'c';

alter table public.servicios drop constraint if exists servicios_oficio_check;
alter table public.servicios add constraint servicios_oficio_check check (oficio in (
  'cafeteria', 'bodega', 'panaderia', 'restaurante', 'mercado', 'farmacia',
  'gasfitero', 'electricista', 'carpintero', 'albanil', 'pintor', 'cerrajero',
  'costurera', 'zapatero', 'peluqueria', 'lavanderia', 'mecanico',
  'tecnico_celulares', 'jardinero', 'mototaxi', 'cuidado_personas',
  'clases_particulares', 'otro',
  'pago_servicios'));   -- nueva: «Agua y luz»


-- ----------------------------------------------------------------------------
-- 7. Reportar publicaciones (moderación de Comunidad)
-- ----------------------------------------------------------------------------
-- Mismo patrón que reportes/ocultar_por_reportes de 01–02, pero en una tabla
-- propia para no cambiar la tabla reportes (que apunta a servicios y que el
-- panel web ya usa). Mismos motivos que reportes. Un reporte por vecino y
-- publicación. Con 3 vecinos distintos, la publicación se oculta sola y el
-- admin la revisa desde el panel.

create table if not exists public.reportes_publicaciones (
  id              uuid primary key default gen_random_uuid(),
  publicacion_id  uuid not null references public.publicaciones (id) on delete cascade,
  vecino_id       uuid not null default auth.uid()
                  references public.perfiles (id) on delete cascade,
  motivo          text not null check (motivo in
                    ('estafa', 'datos_falsos', 'ofensivo', 'no_existe', 'otro')),
  creado_en       timestamptz not null default now(),
  constraint reportes_publicaciones_unico unique (publicacion_id, vecino_id)
);

create index if not exists reportes_publicaciones_pub_idx
  on public.reportes_publicaciones (publicacion_id);
create index if not exists reportes_publicaciones_vecino_idx
  on public.reportes_publicaciones (vecino_id, creado_en);

create or replace function public.validar_reporte_publicacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := auth.uid();
  pub  record;
  n    integer;
begin
  if uid is null then
    return new;
  end if;

  if not public.perfil_completo() then
    raise exception 'PERFIL_INCOMPLETO';
  end if;

  select p.autor, p.oculto into pub from public.publicaciones p where p.id = new.publicacion_id;
  if not found or pub.oculto then
    raise exception 'PUBLICACION_NO_DISPONIBLE';
  end if;

  -- Mismo límite diario que los reportes de servicios (5 por día).
  select count(*) into n from public.reportes_publicaciones
  where vecino_id = uid and creado_en >= public.inicio_dia_lima();
  if n >= 5 then
    raise exception 'LIMITE_DIARIO';
  end if;

  new.vecino_id := uid;
  new.creado_en := now();
  return new;
end;
$$;
comment on function public.validar_reporte_publicacion() is
  'security definer: lee la publicación (sin lectura para la app) y cuenta los reportes propios del día; no devuelve datos.';

drop trigger if exists validar_reporte_publicacion on public.reportes_publicaciones;
create trigger validar_reporte_publicacion
  before insert on public.reportes_publicaciones
  for each row execute function public.validar_reporte_publicacion();

create or replace function public.ocultar_publicacion_por_reportes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  select count(distinct r.vecino_id) into n
  from public.reportes_publicaciones r
  where r.publicacion_id = new.publicacion_id;

  if n >= 3 then
    update public.publicaciones set oculto = true where id = new.publicacion_id;
  end if;
  return null;
end;
$$;
comment on function public.ocultar_publicacion_por_reportes() is
  'security definer: el vecino que reporta no puede editar publicaciones ajenas; la función oculta la publicación por él.';

drop trigger if exists ocultar_publicacion_por_reportes on public.reportes_publicaciones;
create trigger ocultar_publicacion_por_reportes
  after insert on public.reportes_publicaciones
  for each row execute function public.ocultar_publicacion_por_reportes();

alter table public.reportes_publicaciones enable row level security;
revoke insert, update, delete on public.reportes_publicaciones from anon;

drop policy if exists reportes_pub_leer_admin   on public.reportes_publicaciones;
drop policy if exists reportes_pub_crear        on public.reportes_publicaciones;
drop policy if exists reportes_pub_borrar_admin on public.reportes_publicaciones;
create policy reportes_pub_leer_admin   on public.reportes_publicaciones for select to authenticated
  using (public.es_admin());
create policy reportes_pub_crear        on public.reportes_publicaciones for insert to authenticated
  with check (vecino_id = auth.uid() and public.perfil_completo());
create policy reportes_pub_borrar_admin on public.reportes_publicaciones for delete to authenticated
  using (public.es_admin());

revoke execute on function public.validar_reporte_publicacion()      from public, anon, authenticated;
revoke execute on function public.ocultar_publicacion_por_reportes() from public, anon, authenticated;

commit;


-- ----------------------------------------------------------------------------
-- 8. Verificaciones sugeridas (ejecutar DESPUÉS, en el proyecto de desarrollo)
-- ----------------------------------------------------------------------------
-- a) Las tablas nuevas tienen RLS:
--    select relname, relrowsecurity from pg_class
--    where relname in ('publicaciones', 'asistencias');
-- b) La categoría nueva se acepta y 'apoyo' NO (sesión anónima con perfil completo):
--    insert into public.pedidos_ayuda (categoria, descripcion) values ('desastre_natural', 'Prueba');
--    insert into public.pedidos_ayuda (categoria, descripcion) values ('apoyo', 'Prueba');  -- debe fallar
-- c) Sin sesión, la vista no devuelve filas:
--    set role anon; select * from public.publicaciones_cercanas; reset role;
-- d) Un mensaje con enlace se rechaza con CON_ENLACE; la 4.ª publicación del día
--    con LIMITE_DIARIO; un vecino de otra zona no puede marcar «Voy» (ZONA_DISTINTA).
-- e) Tres reportes de vecinos distintos ocultan la publicación (oculto = true) y
--    deja de verse en publicaciones_cercanas.
-- f) Un servicio con oficio 'pago_servicios' se puede publicar.
