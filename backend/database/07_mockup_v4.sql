-- =====================================================================
-- 07_mockup_v4.sql · Proyecto Barrio (app "Vecinos") · Mockup v4
-- Orden de ejecución: 7.º (después de 01 a 05). NO modifica esos
-- archivos: agrega tablas y reemplaza solo lo que el Mockup v4 cambia
-- (yo_ayudo inverso y la vista servicios_publicos con foto).
-- Fuente: Informe definitivo v2 (secc. 22.1), Tecnologías (secc. 5) y
-- Procesos BPMN (F, G).
-- Se puede ejecutar más de una vez. Todo el archivo es una transacción:
-- si algo falla, no se aplica nada.
-- Unifica el borrador del equipo frontend (sql_comunidad_vecinos_borrador):
-- categorías de ayuda nuevas, "Agua y luz", tabla asistencias y vista
-- publicaciones_cercanas con sus mismos nombres de columna.
--
-- Códigos de error nuevos (para errores.ts):
--   CELULAR_NO_VERIFICADO      Ofrecer ayuda o ver datos de una emergencia sin celular verificado
--   BLOQUEADO                  Usuario bloqueado por un admin por abuso
--   EMERGENCIA_TERMINADA       La emergencia se cerró o venció (también en https://kuna-voy.netlify.app)
--   MAXIMO_DOS_CONTACTOS       Más de 2 enlaces por emergencia
--   PUBLICACION_NO_DISPONIBLE  Marcar Voy o comentar una publicación oculta o borrada
-- (Comentar un negocio oculto usa SERVICIO_NO_DISPONIBLE, que ya existía.)
-- =====================================================================

begin;

-- =====================================================================
-- PARTE A. Cambios en tablas existentes
-- =====================================================================

-- F1: tipos de ayuda del Mockup v4 (decisión del equipo del 7-nov:
-- «Apoyo» reemplaza a «Compañía»). Se conservan los 4 anteriores.
--   'desastre_natural' → «Desastre natural» (sismo o lluvia)
--   'apoyo'            → «Apoyo»
-- Antes de volver a crear la restricción se migran los valores que no
-- estén en la lista nueva; si no, add constraint fallaría y la transacción
-- se cancelaría entera. (Con 01–05 no puede haber otros valores, pero un
-- borrador o una carga manual sí podrían haberlos dejado.)
-- Para revisar antes: select distinct categoria from public.pedidos_ayuda;
alter table public.pedidos_ayuda drop constraint if exists pedidos_ayuda_categoria_check;
update public.pedidos_ayuda set categoria = 'apoyo'
where categoria in ('compania', 'compañia', 'compañía');
update public.pedidos_ayuda set categoria = 'desastre_natural'
where categoria in ('sismo', 'lluvia', 'sismo_lluvia', 'desastre');
update public.pedidos_ayuda set categoria = 'apoyo'
where categoria not in ('arreglos', 'compras', 'transporte', 'salud', 'desastre_natural', 'apoyo');
alter table public.pedidos_ayuda add constraint pedidos_ayuda_categoria_check
  check (categoria in ('arreglos', 'compras', 'transporte', 'salud',
                       'desastre_natural', 'apoyo'));

-- Interruptor "Vecinos cerca me ven si pido ayuda" (INC-17). En No, la
-- emergencia avisa solo a los contactos y la persona no recibe alertas.
alter table public.perfiles add column if not exists alerta_vecinal boolean not null default false;

-- E4: foto obligatoria en la app y el interruptor "Mis vecinos pueden
-- verlo", que después de publicar oculta o muestra el negocio (INC-26).
alter table public.servicios add column if not exists foto_path text check (char_length(foto_path) <= 300);
alter table public.servicios add column if not exists visible_vecinos boolean not null default true;

-- Categorías de E1/E4: se agregan "menu" (Menú del día) y
-- "pago_servicios" (Agua y luz: lugares donde pagar recibos; la app no
-- procesa pagos). «Oficios» de E1 agrupa varios oficios solo en la app.
-- Para revisar antes: select distinct oficio from public.servicios;
alter table public.servicios drop constraint if exists servicios_oficio_check;
update public.servicios set oficio = 'menu'           where oficio in ('menu_del_dia', 'menú');
update public.servicios set oficio = 'pago_servicios' where oficio in ('agua_y_luz', 'agua_luz');
update public.servicios set oficio = 'otro' where oficio not in (
  'cafeteria', 'bodega', 'panaderia', 'restaurante', 'menu',
  'mercado', 'farmacia', 'gasfitero', 'electricista',
  'carpintero', 'albanil', 'pintor', 'cerrajero',
  'costurera', 'zapatero', 'peluqueria', 'lavanderia',
  'mecanico', 'tecnico_celulares', 'jardinero',
  'mototaxi', 'cuidado_personas', 'clases_particulares',
  'pago_servicios', 'otro');
alter table public.servicios add constraint servicios_oficio_check check (oficio in (
  'cafeteria', 'bodega', 'panaderia', 'restaurante', 'menu',
  'mercado', 'farmacia', 'gasfitero', 'electricista',
  'carpintero', 'albanil', 'pintor', 'cerrajero',
  'costurera', 'zapatero', 'peluqueria', 'lavanderia',
  'mecanico', 'tecnico_celulares', 'jardinero',
  'mototaxi', 'cuidado_personas', 'clases_particulares',
  'pago_servicios', 'otro'));


-- =====================================================================
-- PARTE B. Tablas nuevas
-- =====================================================================

-- ---------------------------------------------------------------------
-- bloqueos: "si abusa, se reporta y se bloquea". Solo admin.
-- ---------------------------------------------------------------------
create table if not exists public.bloqueos (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  motivo       text check (char_length(motivo) <= 140),
  creado_por   uuid references auth.users (id) on delete set null,
  creado_en    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- push_tokens: dirección de notificación de cada celular. Solo su dueño.
-- ---------------------------------------------------------------------
create table if not exists public.push_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid()
                  references public.perfiles (id) on delete cascade,
  token           text not null unique check (char_length(token) between 10 and 300),
  plataforma      text not null default 'android' check (plataforma in ('android', 'ios')),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- emergencias: datos temporales. La ubicación exacta, el nombre y la
-- dirección vienen del celular al iniciar y se borran al cerrar o vencer.
-- lat_aprox/lng_aprox (3 decimales) quedan para avisar el cierre.
-- ---------------------------------------------------------------------
create table if not exists public.emergencias (
  id              uuid primary key default gen_random_uuid(),
  persona         uuid not null default auth.uid()
                  references public.perfiles (id) on delete cascade,
  estado          text not null default 'activa' check (estado in ('activa', 'cerrada')),
  practica        boolean not null default false,          -- Modo práctica
  avisar_vecinos  boolean not null default false,          -- copia de perfiles.alerta_vecinal
  nombre          text check (char_length(nombre) <= 60),   -- temporal
  direccion       text check (char_length(direccion) <= 120), -- temporal
  lat             numeric(9,6) check (lat between -90 and 90),     -- exacta, temporal
  lng             numeric(9,6) check (lng between -180 and 180),   -- exacta, temporal
  lat_aprox       numeric(7,3),
  lng_aprox       numeric(7,3),
  creado_en       timestamptz not null default now(),
  expira_en       timestamptz not null default (now() + interval '2 hours'),
  cerrada_en      timestamptz,
  constraint emergencias_coordenadas_completas check ((lat is null) = (lng is null))
);

-- ---------------------------------------------------------------------
-- eslabones: estado de cada llamada de la cadena (G2). Solo hechos
-- reales: la app los marca con la duración del registro de llamadas.
-- El número del contacto no se guarda: vive solo en el celular.
-- ---------------------------------------------------------------------
create table if not exists public.eslabones (
  id              uuid primary key default gen_random_uuid(),
  emergencia_id   uuid not null references public.emergencias (id) on delete cascade,
  orden           smallint not null check (orden between 1 and 5),
  contacto        text not null check (char_length(contacto) between 1 and 40), -- "Ana"
  estado          text not null default 'pendiente' check (estado in
                    ('pendiente', 'llamando', 'no_contesto', 'hablamos', 'va_en_camino')),
  duracion_s      integer check (duracion_s >= 0),
  actualizado_en  timestamptz not null default now(),
  constraint eslabones_orden_unico unique (emergencia_id, orden)
);

-- ---------------------------------------------------------------------
-- enlaces: token aleatorio de la página "Voy en camino", publicada en
-- https://kuna-voy.netlify.app. Solo para los 2 contactos. Deja de
-- funcionar al cerrar o vencer la emergencia.
-- ---------------------------------------------------------------------
create table if not exists public.enlaces (
  id               uuid primary key default gen_random_uuid(),
  emergencia_id    uuid not null references public.emergencias (id) on delete cascade,
  eslabon_id       uuid references public.eslabones (id) on delete set null,
  contacto         text not null check (char_length(contacto) between 1 and 40),
  token            text not null unique
                   default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  va_en_camino_en  timestamptz,
  creado_en        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- vecinos_que_van: contador de G2/G3, protecciones y registro de quién
-- vio la dirección.
-- ---------------------------------------------------------------------
create table if not exists public.vecinos_que_van (
  id               uuid primary key default gen_random_uuid(),
  emergencia_id    uuid not null references public.emergencias (id) on delete cascade,
  vecino_id        uuid not null references public.perfiles (id) on delete cascade,
  estado           text not null default 'va' check (estado in ('va', 'ya_no_puede')),
  distancia_m      integer check (distancia_m >= 0),
  vio_datos_en     timestamptz,          -- primera vez que vio nombre y dirección
  reportado        boolean not null default false,  -- la persona lo reporta por abuso
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  constraint vecinos_que_van_unico unique (emergencia_id, vecino_id)
);

-- ---------------------------------------------------------------------
-- publicaciones (F2, F3): kermés, misa, ayuda social, donación, taller.
-- Se requiere foto o mensaje, y la categoría.
-- ---------------------------------------------------------------------
create table if not exists public.publicaciones (
  id          uuid primary key default gen_random_uuid(),
  autor       uuid not null default auth.uid()
              references public.perfiles (id) on delete cascade,
  zona_id     uuid not null references public.zonas (id),
  categoria   text not null check (categoria in
                ('kermes', 'misa', 'ayuda_social', 'donacion', 'taller', 'otro')),
  mensaje     text check (char_length(mensaje) <= 140),
  foto_path   text check (char_length(foto_path) <= 300),
  oculto      boolean not null default false,
  creado_en   timestamptz not null default now(),
  constraint publicaciones_foto_o_mensaje
    check (foto_path is not null or nullif(btrim(mensaje), '') is not null)
);

-- asistencias: botón «Voy» de una publicación (nombre del borrador
-- frontend). Una marca por vecino y publicación; se puede retirar.
create table if not exists public.asistencias (
  id              uuid primary key default gen_random_uuid(),
  publicacion_id  uuid not null references public.publicaciones (id) on delete cascade,
  vecino_id       uuid not null default auth.uid()
                  references public.perfiles (id) on delete cascade,
  creado_en       timestamptz not null default now(),
  constraint asistencias_unico unique (publicacion_id, vecino_id)
);

-- Si ya se ejecutó la versión anterior de este archivo (con la tabla
-- publicaciones_voy), se copian sus marcas a asistencias y se borra.
do $$
begin
  if to_regclass('public.publicaciones_voy') is not null then
    insert into public.asistencias (publicacion_id, vecino_id, creado_en)
    select publicacion_id, vecino_id, creado_en from public.publicaciones_voy
    on conflict (publicacion_id, vecino_id) do nothing;
    drop table public.publicaciones_voy cascade;
  end if;
end $$;
drop view if exists public.publicaciones_zona;

-- Compatibilidad: si ya se ejecutó el borrador del frontend, su tabla
-- publicaciones no tiene foto y exige mensaje. Se ajusta, y se quitan sus
-- triggers y su política para que no se dupliquen con los de este archivo.
alter table public.publicaciones add column if not exists foto_path text check (char_length(foto_path) <= 300);
alter table public.publicaciones alter column mensaje drop not null;
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'publicaciones_foto_o_mensaje'
                   and conrelid = 'public.publicaciones'::regclass) then
    alter table public.publicaciones add constraint publicaciones_foto_o_mensaje
      check (foto_path is not null or nullif(btrim(mensaje), '') is not null);
  end if;
end $$;
drop trigger if exists validar_publicacion  on public.publicaciones;
drop trigger if exists proteger_publicacion on public.publicaciones;
drop trigger if exists validar_asistencia   on public.asistencias;
drop policy  if exists publicaciones_editar_admin on public.publicaciones;
drop function if exists public.validar_publicacion();
drop function if exists public.proteger_publicacion();
drop function if exists public.validar_asistencia();

-- Retención: el nombre del contacto de cada eslabón se borra al cerrar la
-- emergencia (vive solo durante la emergencia), por eso puede quedar nulo.
alter table public.eslabones alter column contacto drop not null;

-- ---------------------------------------------------------------------
-- comentarios: en publicaciones (F2) y en negocios (E3). Uno de los dos.
-- ---------------------------------------------------------------------
create table if not exists public.comentarios (
  id              uuid primary key default gen_random_uuid(),
  autor           uuid not null default auth.uid()
                  references public.perfiles (id) on delete cascade,
  publicacion_id  uuid references public.publicaciones (id) on delete cascade,
  servicio_id     uuid references public.servicios (id) on delete cascade,
  texto           text not null check (char_length(btrim(texto)) between 1 and 140),
  oculto          boolean not null default false,
  creado_en       timestamptz not null default now(),
  constraint comentarios_un_destino
    check ((publicacion_id is null) <> (servicio_id is null))
);

-- Índices
create index if not exists push_tokens_user_idx       on public.push_tokens (user_id);
create index if not exists emergencias_persona_idx    on public.emergencias (persona, estado);
create index if not exists emergencias_activas_idx    on public.emergencias (expira_en) where estado = 'activa';
create index if not exists eslabones_emergencia_idx   on public.eslabones (emergencia_id);
create index if not exists enlaces_emergencia_idx     on public.enlaces (emergencia_id);
create index if not exists vqv_emergencia_idx         on public.vecinos_que_van (emergencia_id, estado);
create index if not exists vqv_vecino_idx             on public.vecinos_que_van (vecino_id);
create index if not exists publicaciones_zona_idx     on public.publicaciones (zona_id, creado_en desc) where not oculto;
create index if not exists publicaciones_autor_idx    on public.publicaciones (autor, creado_en);
create index if not exists comentarios_pub_idx        on public.comentarios (publicacion_id, creado_en);
create index if not exists comentarios_srv_idx        on public.comentarios (servicio_id, creado_en);
create index if not exists comentarios_autor_idx      on public.comentarios (autor, creado_en);
create index if not exists asistencias_vecino_idx     on public.asistencias (vecino_id);
create index if not exists perfiles_alerta_idx        on public.perfiles (zona_id) where alerta_vecinal;


-- =====================================================================
-- PARTE C. Funciones auxiliares
-- =====================================================================

create or replace function public.mi_zona()
returns uuid
language sql stable security definer
set search_path = ''
as $$ select p.zona_id from public.perfiles p where p.id = auth.uid(); $$;
comment on function public.mi_zona() is
  'security definer: devuelve solo la zona del usuario de la sesión; se usa en políticas RLS y de Storage.';

create or replace function public.celular_verificado()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select p.celular_verificado from public.perfiles p where p.id = auth.uid()), false);
$$;

create or replace function public.esta_bloqueado(uid uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.bloqueos b where b.user_id = uid); $$;

-- ¿La emergencia es mía? (evita recursión entre políticas)
create or replace function public.es_mi_emergencia(p_emergencia uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.emergencias e
                 where e.id = p_emergencia and e.persona = auth.uid());
$$;

-- ¿La emergencia sigue activa y sin vencer?
create or replace function public.emergencia_vigente(p_emergencia uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.emergencias e
                 where e.id = p_emergencia and e.estado = 'activa' and e.expira_en > now());
$$;

-- Función de una versión anterior de este archivo. Con cascade se borran
-- también las políticas que aún dependan de ella.
drop function if exists public.publicacion_en_mi_zona(uuid) cascade;


-- =====================================================================
-- PARTE D. Triggers
-- =====================================================================

-- Límites de comunidad (propuesta: 3 publicaciones y 10 comentarios por
-- día) y rechazo de enlaces. Igual que limitar_publicaciones de 02.
create or replace function public.limitar_comunidad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  zona  uuid;
  n     integer;
  z_obj uuid;
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

  zona := public.mi_zona();

  if tg_table_name = 'publicaciones' then
    if public.contiene_enlace(new.mensaje) then
      raise exception 'CON_ENLACE';
    end if;
    select count(*) into n from public.publicaciones
    where autor = uid and creado_en >= public.inicio_dia_lima();
    if n >= 3 then raise exception 'LIMITE_DIARIO'; end if;

    new.autor     := uid;
    new.zona_id   := zona;
    new.mensaje   := nullif(btrim(new.mensaje), '');
    new.oculto    := false;
    new.creado_en := now();

  elsif tg_table_name = 'comentarios' then
    if public.contiene_enlace(new.texto) then
      raise exception 'CON_ENLACE';
    end if;

    if new.publicacion_id is not null then
      select pu.zona_id into z_obj from public.publicaciones pu
      where pu.id = new.publicacion_id and not pu.oculto;
      if z_obj is null then raise exception 'PUBLICACION_NO_DISPONIBLE'; end if;
    else
      select s.zona_id into z_obj from public.servicios s
      where s.id = new.servicio_id and not s.oculto and s.visible_vecinos;
      if z_obj is null then raise exception 'SERVICIO_NO_DISPONIBLE'; end if;
    end if;
    if z_obj is distinct from zona then
      raise exception 'ZONA_DISTINTA';
    end if;

    select count(*) into n from public.comentarios
    where autor = uid and creado_en >= public.inicio_dia_lima();
    if n >= 10 then raise exception 'LIMITE_DIARIO'; end if;

    new.autor     := uid;
    new.texto     := btrim(new.texto);
    new.oculto    := false;
    new.creado_en := now();

  elsif tg_table_name = 'asistencias' then
    select pu.zona_id into z_obj from public.publicaciones pu
    where pu.id = new.publicacion_id and not pu.oculto;
    if z_obj is null then
      raise exception 'PUBLICACION_NO_DISPONIBLE';
    end if;
    if z_obj is distinct from zona then
      raise exception 'ZONA_DISTINTA';
    end if;

    new.vecino_id := uid;
    new.creado_en := now();
  end if;

  return new;
end;
$$;
comment on function public.limitar_comunidad() is
  'security definer: cuenta filas del propio usuario y valida la zona del contenido; no devuelve datos.';

drop trigger if exists limitar_comunidad on public.publicaciones;
create trigger limitar_comunidad before insert on public.publicaciones
  for each row execute function public.limitar_comunidad();

drop trigger if exists limitar_comunidad on public.comentarios;
create trigger limitar_comunidad before insert on public.comentarios
  for each row execute function public.limitar_comunidad();

drop trigger if exists limitar_comunidad on public.asistencias;
create trigger limitar_comunidad before insert on public.asistencias
  for each row execute function public.limitar_comunidad();

-- Al editar desde la app no se cambia autor, zona, destino ni oculto.
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
      new.oculto := old.oculto;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_comunidad on public.publicaciones;
create trigger proteger_comunidad before update on public.publicaciones
  for each row execute function public.proteger_comunidad();
drop trigger if exists proteger_comunidad on public.comentarios;
create trigger proteger_comunidad before update on public.comentarios
  for each row execute function public.proteger_comunidad();

-- push_tokens: siempre del usuario de la sesión.
create or replace function public.preparar_push_token()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.user_id := auth.uid();
    if tg_op = 'UPDATE' then new.creado_en := old.creado_en; end if;
  end if;
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists preparar_push_token on public.push_tokens;
create trigger preparar_push_token before insert or update on public.push_tokens
  for each row execute function public.preparar_push_token();

-- registrar_push_token: la app SIEMPRE registra el token con esta función
-- (no con insert directo). Si el mismo celular ya estaba registrado con
-- otro usuario (por ejemplo, entró con otra cuenta), el token se reasigna
-- al usuario de la sesión. Un token es un celular: solo un dueño a la vez.
create or replace function public.registrar_push_token(p_token text, p_plataforma text default 'android')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'PERFIL_INCOMPLETO';
  end if;
  if not exists (select 1 from public.perfiles p where p.id = auth.uid()) then
    raise exception 'PERFIL_INCOMPLETO';
  end if;

  insert into public.push_tokens (user_id, token, plataforma)
  values (auth.uid(), p_token, coalesce(p_plataforma, 'android'))
  on conflict (token) do update
    set user_id        = excluded.user_id,
        plataforma     = excluded.plataforma,
        actualizado_en = now();
  return true;
end;
$$;
comment on function public.registrar_push_token(text, text) is
  'security definer: la RLS no deja tocar el token de otro usuario; esta función lo reasigna al usuario de la sesión cuando el mismo celular cambia de cuenta.';

-- emergencias: al crear, fija persona, estado y vencimiento, redondea la
-- ubicación aproximada, copia el interruptor de alerta y cierra cualquier
-- emergencia anterior que haya quedado abierta (por si la app se cerró).
create or replace function public.preparar_emergencia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is not null then
    new.persona := uid;
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
  -- Modo práctica: nunca avisa a vecinos reales (solo a los contactos,
  -- con mensajes "Práctica de ..."). Así ningún vecino recibe una alerta
  -- de una simulación.
  new.avisar_vecinos := not new.practica and coalesce(
    (select p.alerta_vecinal from public.perfiles p where p.id = new.persona), false);

  -- Retención: aprovecha cada emergencia nueva para limpiar las vencidas
  -- y borrar las antiguas, aunque no esté activado pg_cron.
  perform public.limpiar_emergencias_vencidas();
  return new;
end;
$$;
comment on function public.preparar_emergencia() is
  'security definer: cierra emergencias previas del mismo usuario, lee su interruptor de alerta y ejecuta la limpieza de retención.';

drop trigger if exists preparar_emergencia on public.emergencias;
create trigger preparar_emergencia before insert on public.emergencias
  for each row execute function public.preparar_emergencia();

-- eslabones y enlaces: solo en emergencias vigentes; máximo 2 enlaces;
-- el eslabón de un enlace debe ser de la misma emergencia.
create or replace function public.validar_cadena()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if auth.uid() is null or current_setting('barrio.limpieza', true) = 'on' then
    return new;
  end if;
  if tg_table_name = 'enlaces' then
    -- (if anidado: en eslabones el registro new no tiene eslabon_id)
    if new.eslabon_id is not null
       and not exists (select 1 from public.eslabones es
                       where es.id = new.eslabon_id and es.emergencia_id = new.emergencia_id) then
      raise exception 'ESLABON_DE_OTRA_EMERGENCIA';
    end if;
  end if;
  if not public.emergencia_vigente(new.emergencia_id) then
    raise exception 'EMERGENCIA_TERMINADA';
  end if;

  if tg_table_name = 'eslabones' then
    if tg_op = 'UPDATE' then
      new.emergencia_id := old.emergencia_id;
      new.orden         := old.orden;
    end if;
    new.actualizado_en := now();
  elsif tg_table_name = 'enlaces' and tg_op = 'INSERT' then
    select count(*) into n from public.enlaces where emergencia_id = new.emergencia_id;
    if n >= 2 then raise exception 'MAXIMO_DOS_CONTACTOS'; end if;
    -- El token siempre lo genera la base; la app no puede elegirlo.
    new.token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    new.va_en_camino_en := null;
    new.creado_en := now();
  elsif tg_table_name = 'enlaces' and tg_op = 'UPDATE' then
    new.token           := old.token;
    new.emergencia_id   := old.emergencia_id;
    new.va_en_camino_en := old.va_en_camino_en;
  end if;
  if tg_table_name = 'eslabones' and new.contacto is null then
    raise exception 'FALTA_CONTACTO';  -- solo la limpieza puede dejarlo vacío
  end if;
  return new;
end;
$$;

drop trigger if exists validar_cadena on public.eslabones;
create trigger validar_cadena before insert or update on public.eslabones
  for each row execute function public.validar_cadena();
drop trigger if exists validar_cadena on public.enlaces;
create trigger validar_cadena before insert or update on public.enlaces
  for each row execute function public.validar_cadena();

-- vecinos_que_van: la persona solo puede marcar "reportado"; el resto lo
-- escriben las funciones voy_a_ayudar y ya_no_puedo_ir.
create or replace function public.proteger_vecinos_que_van()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  rep boolean := new.reportado;
begin
  if current_user in ('anon', 'authenticated') then
    new := old;
    new.reportado := rep;
    new.actualizado_en := now();
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_vecinos_que_van on public.vecinos_que_van;
create trigger proteger_vecinos_que_van before update on public.vecinos_que_van
  for each row execute function public.proteger_vecinos_que_van();


-- =====================================================================
-- PARTE E. Funciones RPC
-- =====================================================================

-- ---------------------------------------------------------------------
-- yo_ayudo INVERSO (opción A1): quien ofrece ayuda debe tener celular
-- verificado. Ya no devuelve el contacto de quien pidió: es quien pidió
-- quien ve el número del ayudante (vista ayudas_recibidas).
-- Cambia el tipo de retorno, por eso se borra y se vuelve a crear.
-- ---------------------------------------------------------------------
drop function if exists public.yo_ayudo(uuid);
create function public.yo_ayudo(p_pedido_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  ped      record;
begin
  if uid is null or not public.perfil_completo() then
    raise exception 'PERFIL_INCOMPLETO';
  end if;
  if not public.celular_verificado() then
    raise exception 'CELULAR_NO_VERIFICADO';
  end if;
  if public.esta_bloqueado(uid) then
    raise exception 'BLOQUEADO';
  end if;

  select pa.autor, pa.zona_id, pa.estado, pa.expira_en into ped
  from public.pedidos_ayuda pa where pa.id = p_pedido_id;

  if not found or ped.estado <> 'abierto' or ped.expira_en <= now() or ped.autor = uid then
    raise exception 'PEDIDO_NO_DISPONIBLE';
  end if;
  if public.mi_zona() is distinct from ped.zona_id then
    raise exception 'ZONA_DISTINTA';
  end if;

  insert into public.ayudas_ofrecidas (pedido_id, ayudante_id)
  values (p_pedido_id, uid)
  on conflict (pedido_id, ayudante_id) do nothing;

  return true;
end;
$$;
comment on function public.yo_ayudo(uuid) is
  'security definer: valida perfil, celular verificado, zona y vigencia, y registra al ayudante. No entrega datos de quien pidió (opción A1).';

-- ---------------------------------------------------------------------
-- Cerrar la emergencia ("Estoy bien, cancelar"): borra los datos
-- temporales; el enlace deja de funcionar.
-- ---------------------------------------------------------------------
create or replace function public.cerrar_emergencia(p_emergencia uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  ok boolean;
begin
  update public.emergencias
  set estado = 'cerrada', cerrada_en = coalesce(cerrada_en, now()),
      nombre = null, direccion = null, lat = null, lng = null
  where id = p_emergencia and persona = auth.uid();
  ok := found;
  perform public.limpiar_emergencias_vencidas();  -- borra enlaces y nombres de contactos
  return ok;
end;
$$;
comment on function public.cerrar_emergencia(uuid) is
  'security definer: la app no tiene política de update en emergencias; solo la persona cierra la suya.';

-- ---------------------------------------------------------------------
-- Retención (Ley 29733 y "los datos viven solo durante la emergencia"):
--   1. Cierra las emergencias activas que pasaron sus 2 h.
--   2. En toda emergencia cerrada: borra nombre, dirección y ubicación
--      exacta, el nombre de cada contacto de la cadena y los enlaces.
--   3. A los 7 días del cierre borra la emergencia completa (y en cascada
--      eslabones, vecinos_que_van y la ubicación aproximada). Esos 7 días
--      sirven para revisar abusos con el registro de quién vio los datos.
-- Se ejecuta sola al crear o cerrar una emergencia; con pg_cron, además
-- cada 10 minutos (ver el final del archivo).
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

  perform set_config('barrio.limpieza', 'off', true);
  return n;
end;
$$;
comment on function public.limpiar_emergencias_vencidas() is
  'security definer: aplica la retención a todas las emergencias. Solo la ejecutan las funciones de cierre, el trigger de inicio y service_role.';

-- ---------------------------------------------------------------------
-- Para la Edge Function alerta-vecinos (solo service_role): vecinos con
-- alerta activa, celular verificado y domicilio aproximado a ~500 m.
-- ---------------------------------------------------------------------
create or replace function public.vecinos_para_alerta(p_emergencia uuid)
returns table (user_id uuid, token text, distancia_m integer)
language sql stable security definer
set search_path = ''
as $$
  select p.id, t.token,
         round(public.distancia_m(p.lat, p.lng, e.lat_aprox, e.lng_aprox))::int
  from public.emergencias e
  join public.perfiles p on p.id <> e.persona
  join public.push_tokens t on t.user_id = p.id
  where e.id = p_emergencia
    and e.avisar_vecinos
    and not e.practica
    and p.alerta_vecinal
    and p.celular_verificado
    and p.lat is not null
    and not public.esta_bloqueado(p.id)
    and public.distancia_m(p.lat, p.lng, e.lat_aprox, e.lng_aprox) <= 500;
$$;
comment on function public.vecinos_para_alerta(uuid) is
  'Solo service_role (Edge Function alerta-vecinos). Sirve para el aviso inicial y para el de cierre ("Ya no hace falta, gracias").';

-- ---------------------------------------------------------------------
-- G3 antes de confirmar: solo distancia y cuántos van. Sin datos.
-- ---------------------------------------------------------------------
create or replace function public.ver_alerta(p_emergencia uuid, p_lat numeric, p_lng numeric)
returns table (activa boolean, distancia_m integer, vecinos_en_camino integer)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  e record;
begin
  if auth.uid() is null then
    raise exception 'PERFIL_INCOMPLETO';
  end if;
  if not public.celular_verificado() then
    raise exception 'CELULAR_NO_VERIFICADO';
  end if;

  select em.lat_aprox, em.lng_aprox, em.estado, em.expira_en into e
  from public.emergencias em
  where em.id = p_emergencia and em.avisar_vecinos and not em.practica;
  if not found then
    raise exception 'EMERGENCIA_TERMINADA';
  end if;

  return query select
    (e.estado = 'activa' and e.expira_en > now()),
    (round(public.distancia_m(p_lat, p_lng, e.lat_aprox, e.lng_aprox) / 10) * 10)::int,
    (select count(*)::int from public.vecinos_que_van v
     where v.emergencia_id = p_emergencia and v.estado = 'va');
end;
$$;

-- ---------------------------------------------------------------------
-- "Voy a ayudar" (después de deslizar). Solo cuenta como "va" y solo ve
-- nombre, dirección y ubicación quien cumple TODO:
--   · celular verificado y no bloqueado;
--   · alerta vecinal activa;
--   · domicilio guardado en su perfil a 500 m o menos (el mismo criterio
--     que vecinos_para_alerta: no depende de lo que mande el celular);
--   · ubicación actual que envía la app a 1 km o menos.
-- Si no cumple, recibe solo la distancia y el contador, y NO se registra
-- (el contador de Rosa muestra solo estados reales).
-- ---------------------------------------------------------------------
create or replace function public.voy_a_ayudar(p_emergencia uuid, p_lat numeric, p_lng numeric)
returns table (datos_revelados boolean, nombre text, direccion text,
               lat numeric, lng numeric, distancia_m integer, vecinos_en_camino integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid        uuid := auth.uid();
  e          record;
  yo         record;
  dist       double precision;
  dist_casa  double precision;
  ok         boolean;
begin
  if uid is null then
    raise exception 'PERFIL_INCOMPLETO';
  end if;
  if not public.celular_verificado() then
    raise exception 'CELULAR_NO_VERIFICADO';
  end if;
  if public.esta_bloqueado(uid) then
    raise exception 'BLOQUEADO';
  end if;

  select em.persona, em.nombre, em.direccion, em.lat, em.lng, em.lat_aprox, em.lng_aprox
  into e
  from public.emergencias em
  where em.id = p_emergencia and em.avisar_vecinos and not em.practica
    and em.estado = 'activa' and em.expira_en > now();
  if not found then
    raise exception 'EMERGENCIA_TERMINADA';
  end if;
  if e.persona = uid then
    raise exception 'EMERGENCIA_TERMINADA';
  end if;

  select p.alerta_vecinal, p.lat, p.lng into yo
  from public.perfiles p where p.id = uid;

  dist      := public.distancia_m(p_lat, p_lng, coalesce(e.lat, e.lat_aprox), coalesce(e.lng, e.lng_aprox));
  dist_casa := public.distancia_m(yo.lat, yo.lng, e.lat_aprox, e.lng_aprox);
  ok := coalesce(yo.alerta_vecinal, false)
        and dist_casa is not null and dist_casa <= 500
        and dist is not null and dist <= 1000;

  if not ok then
    return query select false, null::text, null::text, null::numeric, null::numeric,
      round(dist)::int,
      (select count(*)::int from public.vecinos_que_van v
       where v.emergencia_id = p_emergencia and v.estado = 'va');
    return;
  end if;

  insert into public.vecinos_que_van (emergencia_id, vecino_id, estado, distancia_m, vio_datos_en)
  values (p_emergencia, uid, 'va', round(dist)::int, now())
  on conflict (emergencia_id, vecino_id) do update
    set estado = 'va',
        distancia_m = excluded.distancia_m,
        vio_datos_en = coalesce(public.vecinos_que_van.vio_datos_en, excluded.vio_datos_en),
        actualizado_en = now();

  return query select
    true, e.nombre, e.direccion, e.lat, e.lng,
    round(dist)::int,
    (select count(*)::int from public.vecinos_que_van v
     where v.emergencia_id = p_emergencia and v.estado = 'va');
end;
$$;
comment on function public.voy_a_ayudar(uuid, numeric, numeric) is
  'security definer: aplica las protecciones (verificado, alerta activa, domicilio a 500 m, ubicación actual a 1 km, registro de quién vio) antes de entregar datos temporales. Si no cumple, no registra nada.';

-- "Ya no puedo ir": oculta la dirección y resta 1 al contador.
create or replace function public.ya_no_puedo_ir(p_emergencia uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.vecinos_que_van
  set estado = 'ya_no_puede', actualizado_en = now()
  where emergencia_id = p_emergencia and vecino_id = auth.uid();
  return found;
end;
$$;

-- ---------------------------------------------------------------------
-- Página "Voy en camino", publicada en https://kuna-voy.netlify.app.
-- No es una Edge Function. Se llaman con el token; el contacto no
-- tiene cuenta, por eso están abiertas a anon.
-- ---------------------------------------------------------------------
create or replace function public.enlace_ver(p_token text)
returns table (nombre text, direccion text, lat numeric, lng numeric, va_en_camino boolean)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  return query
    select e.nombre, e.direccion, e.lat, e.lng, (en.va_en_camino_en is not null)
    from public.enlaces en
    join public.emergencias e on e.id = en.emergencia_id
    where en.token = p_token and e.estado = 'activa' and e.expira_en > now();
  if not found then
    raise exception 'EMERGENCIA_TERMINADA';
  end if;
end;
$$;

create or replace function public.enlace_voy(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  en record;
begin
  select l.id, l.eslabon_id into en
  from public.enlaces l
  join public.emergencias e on e.id = l.emergencia_id
  where l.token = p_token and e.estado = 'activa' and e.expira_en > now();
  if not found then
    raise exception 'EMERGENCIA_TERMINADA';
  end if;

  update public.enlaces set va_en_camino_en = coalesce(va_en_camino_en, now()) where id = en.id;
  if en.eslabon_id is not null then
    update public.eslabones set estado = 'va_en_camino', actualizado_en = now()
    where id = en.eslabon_id;
  end if;
  return true;
end;
$$;
comment on function public.enlace_ver(text) is
  'security definer, abierta a anon: el token aleatorio es la llave. Solo responde mientras la emergencia esté activa.';


-- =====================================================================
-- PARTE F. Vistas (security definer a propósito, como en 02)
-- =====================================================================

-- servicios_publicos: se vuelve a crear con foto y el interruptor
-- "Mis vecinos pueden verlo". Mismas columnas que 02 + foto_path.
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
  s.visible_vecinos,
  s.foto_path,
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
  where vb.servicio_id = s.id and vb.mostrar_comentario and vb.comentario is not null
  order by vb.creado_en desc
  limit 1
) cd on true
where not s.oculto
  and s.zona_id = public.mi_zona()                    -- solo los negocios de mi zona
  and (s.visible_vecinos or s.autor = auth.uid());    -- el dueño sigue viendo su negocio oculto

comment on view public.servicios_publicos is
  'Vista security definer a propósito (ver 02). Desde 07: incluye foto_path y visible_vecinos; solo devuelve negocios de la zona de quien consulta; los vecinos no ven negocios con visible_vecinos falso (el dueño sí); sin sesión no devuelve filas.';

-- Comunidad (F2): publicaciones de mi zona. Mismas columnas que el
-- borrador frontend (autor_corto, asistentes, voy, minutos_antiguedad)
-- más foto_path y comentarios.
drop view if exists public.publicaciones_cercanas;
create view public.publicaciones_cercanas
with (security_invoker = false)
as
select
  pu.id,
  public.nombre_corto(p.nombre)                                      as autor_corto,
  pu.categoria,
  pu.mensaje,
  pu.foto_path,
  pu.zona_id,
  pu.creado_en,
  (extract(epoch from (now() - pu.creado_en)) / 60)::int             as minutos_antiguedad,
  (select count(*)::int from public.asistencias a
   where a.publicacion_id = pu.id)                                   as asistentes,
  exists (select 1 from public.asistencias a
          where a.publicacion_id = pu.id and a.vecino_id = auth.uid()) as voy,
  (select count(*)::int from public.comentarios c
   where c.publicacion_id = pu.id and not c.oculto)                  as comentarios,
  (pu.autor = auth.uid())                                            as es_mio
from public.publicaciones pu
join public.perfiles p on p.id = pu.autor
where not pu.oculto
  and pu.zona_id = (select pz.zona_id from public.perfiles pz where pz.id = auth.uid());

comment on view public.publicaciones_cercanas is
  'Vista security definer a propósito: muestra publicaciones visibles solo de la zona de quien consulta, con nombre corto del autor, asistentes, si yo voy y número de comentarios, sin abrir las tablas publicaciones, asistencias, comentarios ni perfiles. Sin sesión no devuelve filas.';

-- Comentarios visibles (F2 y E3), de contenido de mi zona.
drop view if exists public.comentarios_visibles;
create view public.comentarios_visibles
with (security_invoker = false)
as
select
  c.id,
  c.publicacion_id,
  c.servicio_id,
  public.nombre_corto(p.nombre)  as autor_corto,
  c.texto,
  c.creado_en,
  (c.autor = auth.uid())         as es_mio
from public.comentarios c
join public.perfiles p on p.id = c.autor
left join public.publicaciones pu on pu.id = c.publicacion_id
left join public.servicios s      on s.id  = c.servicio_id
where not c.oculto
  and coalesce(pu.zona_id, s.zona_id) = (select pz.zona_id from public.perfiles pz where pz.id = auth.uid())
  and (pu.id is null or not pu.oculto)
  and (s.id  is null or (not s.oculto and s.visible_vecinos));

comment on view public.comentarios_visibles is
  'Vista security definer a propósito: comentarios de publicaciones y negocios de la zona de quien consulta.';

-- Ayudas recibidas: quien pidió ve el número de quien ofreció (A1).
drop view if exists public.ayudas_recibidas;
create view public.ayudas_recibidas
with (security_invoker = false)
as
select
  ao.id,
  ao.pedido_id,
  pa.categoria,
  public.nombre_corto(p.nombre)  as ayudante_nombre,
  p.celular                      as ayudante_celular,
  ao.creado_en
from public.ayudas_ofrecidas ao
join public.pedidos_ayuda pa on pa.id = ao.pedido_id
join public.perfiles p       on p.id  = ao.ayudante_id
where pa.autor = auth.uid()
  and not public.esta_bloqueado(ao.ayudante_id);  -- un ayudante bloqueado deja de mostrarse

comment on view public.ayudas_recibidas is
  'Vista security definer a propósito: solo el autor del pedido ve el nombre corto y el celular verificado de quien ofreció ayuda.';


-- =====================================================================
-- PARTE G. Seguridad por filas (RLS) de las tablas nuevas
-- =====================================================================

alter table public.bloqueos           enable row level security;
alter table public.push_tokens        enable row level security;
alter table public.emergencias        enable row level security;
alter table public.eslabones          enable row level security;
alter table public.enlaces            enable row level security;
alter table public.vecinos_que_van    enable row level security;
alter table public.publicaciones      enable row level security;
alter table public.asistencias        enable row level security;
alter table public.comentarios        enable row level security;

revoke insert, update, delete on all tables in schema public from anon;

-- bloqueos: solo admin
drop policy if exists bloqueos_admin on public.bloqueos;
create policy bloqueos_admin on public.bloqueos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- push_tokens: solo su dueño
drop policy if exists push_propio on public.push_tokens;
create policy push_propio on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- emergencias: la persona, los vecinos que confirmaron (mientras vayan y
-- la emergencia siga vigente) y admin. Se crean desde la app; se cierran
-- con cerrar_emergencia().
drop policy if exists emergencias_leer  on public.emergencias;
drop policy if exists emergencias_crear on public.emergencias;
create policy emergencias_leer on public.emergencias for select to authenticated
  using (
    persona = auth.uid()
    or public.es_admin()
    or (estado = 'activa' and expira_en > now() and exists (
          select 1 from public.vecinos_que_van v
          where v.emergencia_id = emergencias.id and v.vecino_id = auth.uid()
            and v.estado = 'va' and v.vio_datos_en is not null))
  );
create policy emergencias_crear on public.emergencias for insert to authenticated
  with check (persona = auth.uid());

-- eslabones: la persona (crea y actualiza) y admin (solo lee)
drop policy if exists eslabones_leer   on public.eslabones;
drop policy if exists eslabones_crear  on public.eslabones;
drop policy if exists eslabones_editar on public.eslabones;
create policy eslabones_leer   on public.eslabones for select to authenticated
  using (public.es_mi_emergencia(emergencia_id) or public.es_admin());
create policy eslabones_crear  on public.eslabones for insert to authenticated
  with check (public.es_mi_emergencia(emergencia_id));
create policy eslabones_editar on public.eslabones for update to authenticated
  using (public.es_mi_emergencia(emergencia_id))
  with check (public.es_mi_emergencia(emergencia_id));

-- enlaces: la persona los crea y lee (necesita el token para el SMS).
-- El contacto entra desde https://kuna-voy.netlify.app, solo con
-- enlace_ver / enlace_voy y el token.
drop policy if exists enlaces_leer  on public.enlaces;
drop policy if exists enlaces_crear on public.enlaces;
create policy enlaces_leer  on public.enlaces for select to authenticated
  using (public.es_mi_emergencia(emergencia_id) or public.es_admin());
create policy enlaces_crear on public.enlaces for insert to authenticated
  with check (public.es_mi_emergencia(emergencia_id));

-- vecinos_que_van: la persona, el propio vecino y admin leen. Se escribe
-- con voy_a_ayudar / ya_no_puedo_ir; la persona solo marca "reportado".
drop policy if exists vqv_leer     on public.vecinos_que_van;
drop policy if exists vqv_reportar on public.vecinos_que_van;
create policy vqv_leer on public.vecinos_que_van for select to authenticated
  using (vecino_id = auth.uid() or public.es_mi_emergencia(emergencia_id) or public.es_admin());
create policy vqv_reportar on public.vecinos_que_van for update to authenticated
  using (public.es_mi_emergencia(emergencia_id))
  with check (public.es_mi_emergencia(emergencia_id));

-- publicaciones: el autor y admin en la tabla; los vecinos por la vista
drop policy if exists publicaciones_leer   on public.publicaciones;
drop policy if exists publicaciones_crear  on public.publicaciones;
drop policy if exists publicaciones_editar on public.publicaciones;
drop policy if exists publicaciones_borrar on public.publicaciones;
create policy publicaciones_leer   on public.publicaciones for select to authenticated
  using (autor = auth.uid() or public.es_admin());
create policy publicaciones_crear  on public.publicaciones for insert to authenticated
  with check (autor = auth.uid() and public.perfil_completo());
create policy publicaciones_editar on public.publicaciones for update to authenticated
  using (autor = auth.uid() or public.es_admin())
  with check (autor = auth.uid() or public.es_admin());
create policy publicaciones_borrar on public.publicaciones for delete to authenticated
  using (autor = auth.uid() or public.es_admin());

-- asistencias: marcar y retirar «Voy». La zona y que la publicación esté
-- visible las valida el trigger limitar_comunidad (con código de error).
drop policy if exists asistencias_leer    on public.asistencias;
drop policy if exists asistencias_crear   on public.asistencias;
drop policy if exists asistencias_retirar on public.asistencias;
create policy asistencias_leer    on public.asistencias for select to authenticated
  using (vecino_id = auth.uid() or public.es_admin());
create policy asistencias_crear   on public.asistencias for insert to authenticated
  with check (vecino_id = auth.uid() and public.perfil_completo());
create policy asistencias_retirar on public.asistencias for delete to authenticated
  using (vecino_id = auth.uid() or public.es_admin());

-- comentarios: el autor y admin en la tabla; los vecinos por la vista
drop policy if exists comentarios_leer   on public.comentarios;
drop policy if exists comentarios_crear  on public.comentarios;
drop policy if exists comentarios_editar on public.comentarios;
drop policy if exists comentarios_borrar on public.comentarios;
create policy comentarios_leer   on public.comentarios for select to authenticated
  using (autor = auth.uid() or public.es_admin());
create policy comentarios_crear  on public.comentarios for insert to authenticated
  with check (autor = auth.uid() and public.perfil_completo());
create policy comentarios_editar on public.comentarios for update to authenticated
  using (autor = auth.uid() or public.es_admin())
  with check (autor = auth.uid() or public.es_admin());
create policy comentarios_borrar on public.comentarios for delete to authenticated
  using (autor = auth.uid() or public.es_admin());


-- =====================================================================
-- PARTE H. Permisos de ejecución y de vistas
-- =====================================================================
revoke execute on function public.mi_zona()                              from public, anon;
revoke execute on function public.celular_verificado()                   from public, anon;
revoke execute on function public.esta_bloqueado(uuid)                   from public, anon;
revoke execute on function public.es_mi_emergencia(uuid)                 from public, anon;
revoke execute on function public.emergencia_vigente(uuid)               from public, anon;
revoke execute on function public.yo_ayudo(uuid)                         from public, anon;
revoke execute on function public.cerrar_emergencia(uuid)                from public, anon;
revoke execute on function public.ver_alerta(uuid, numeric, numeric)     from public, anon;
revoke execute on function public.voy_a_ayudar(uuid, numeric, numeric)   from public, anon;
revoke execute on function public.ya_no_puedo_ir(uuid)                   from public, anon;
revoke execute on function public.limpiar_emergencias_vencidas()         from public, anon, authenticated;
revoke execute on function public.vecinos_para_alerta(uuid)              from public, anon, authenticated;
revoke execute on function public.limitar_comunidad()                    from public, anon, authenticated;
revoke execute on function public.proteger_comunidad()                   from public, anon, authenticated;
revoke execute on function public.preparar_push_token()                  from public, anon, authenticated;
revoke execute on function public.preparar_emergencia()                  from public, anon, authenticated;
revoke execute on function public.validar_cadena()                       from public, anon, authenticated;
revoke execute on function public.proteger_vecinos_que_van()             from public, anon, authenticated;
revoke execute on function public.enlace_ver(text)                       from public;
revoke execute on function public.enlace_voy(text)                       from public;

grant execute on function public.mi_zona()                              to authenticated;
grant execute on function public.celular_verificado()                   to authenticated;
grant execute on function public.esta_bloqueado(uuid)                   to authenticated;
grant execute on function public.es_mi_emergencia(uuid)                 to authenticated;
grant execute on function public.emergencia_vigente(uuid)               to authenticated;
grant execute on function public.yo_ayudo(uuid)                         to authenticated;
grant execute on function public.cerrar_emergencia(uuid)                to authenticated;
grant execute on function public.ver_alerta(uuid, numeric, numeric)     to authenticated;
grant execute on function public.voy_a_ayudar(uuid, numeric, numeric)   to authenticated;
grant execute on function public.ya_no_puedo_ir(uuid)                   to authenticated;
grant execute on function public.enlace_ver(text)                       to anon, authenticated;
grant execute on function public.enlace_voy(text)                       to anon, authenticated;
grant execute on function public.vecinos_para_alerta(uuid)              to service_role;
grant execute on function public.limpiar_emergencias_vencidas()         to service_role;
revoke execute on function public.registrar_push_token(text, text)      from public, anon;
grant  execute on function public.registrar_push_token(text, text)      to authenticated;

-- servicios_publicos ya no se lee sin sesión. OJO: la sesión anónima de la
-- app también es rol authenticated, así que lo que realmente limita la
-- lectura es el filtro por zona (mi_zona()) dentro de la vista.
revoke all   on public.servicios_publicos   from anon;
grant select on public.servicios_publicos   to authenticated;
grant select on public.publicaciones_cercanas to authenticated;
grant select on public.comentarios_visibles to authenticated;
grant select on public.ayudas_recibidas     to authenticated;
revoke all   on public.publicaciones_cercanas from anon;
revoke all   on public.comentarios_visibles from anon;
revoke all   on public.ayudas_recibidas     from anon;
revoke all   on public.bloqueos             from anon, authenticated;
grant select, insert, update, delete on public.bloqueos to authenticated;  -- filtrado por la política (solo admin)


-- =====================================================================
-- PARTE I. Storage: bucket privado "fotos" (negocios y publicaciones)
-- Ruta obligatoria: <zona_id>/<user_id>/<archivo>.jpg
-- Solo los vecinos de la zona ven las fotos; cada uno sube y borra las suyas.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fotos_ver_mi_zona on storage.objects;
drop policy if exists fotos_subir       on storage.objects;
drop policy if exists fotos_borrar      on storage.objects;
create policy fotos_ver_mi_zona on storage.objects for select to authenticated
  using (bucket_id = 'fotos'
         and ((storage.foldername(name))[1] = public.mi_zona()::text or public.es_admin()));
create policy fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos'
              and (storage.foldername(name))[1] = public.mi_zona()::text
              and (storage.foldername(name))[2] = auth.uid()::text
              and public.perfil_completo());
create policy fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos'
         and ((storage.foldername(name))[2] = auth.uid()::text or public.es_admin()));


-- =====================================================================
-- PARTE J. Realtime: contador de vecinos que van y estado de la cadena
-- (G2 y panel). Respeta la RLS de cada tabla.
-- =====================================================================
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['emergencias', 'eslabones', 'enlaces', 'vecinos_que_van'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- Limpieza programada cada 10 minutos (pg_cron). Sin esto, una emergencia
-- vencida conserva nombre y dirección hasta que alguien cree o cierre otra.
-- Si pg_cron no se puede activar desde aquí, el script sigue y solo avisa:
-- actívalo en Database > Extensions y vuelve a ejecutar este archivo.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('limpiar-emergencias', '*/10 * * * *',
                        'select public.limpiar_emergencias_vencidas()');
exception when others then
  raise notice 'pg_cron no quedó activo (%): activa la extensión y vuelve a ejecutar.', sqlerrm;
end $$;

commit;
