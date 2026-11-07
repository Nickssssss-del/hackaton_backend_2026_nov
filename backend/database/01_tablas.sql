-- 01_tablas.sql · Proyecto Barrio (app "Vecinos") · Módulo 1
-- Orden de ejecución: 1.º
-- Tablas, claves, restricciones únicas, CHECK de categorías e índices.
-- Se puede ejecutar más de una vez (if not exists).

-- zonas: lectura sin sesión, escritura solo admin
create table if not exists public.zonas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(nombre) between 1 and 80),
  distrito    text not null check (char_length(distrito) between 1 and 80),
  lat_centro  numeric(7,3) not null check (lat_centro between -90 and 90),
  lng_centro  numeric(7,3) not null check (lng_centro between -180 and 180),
  radio_m     integer not null check (radio_m between 100 and 20000),
  creado_en   timestamptz not null default now(),
  unique (nombre, distrito)
);

-- perfiles: id = auth.uid(). Sin rol, sin DNI, sin ficha de salud.
-- celular: 9 dígitos que empiezan en 9 (el 51 no se guarda).
-- celular_verificado y cuenta_asegurada_en: solo para cuentas
-- recuperables (fuera del MVP); la app no puede cambiarlas.
create table if not exists public.perfiles (
  id                   uuid primary key default auth.uid()
                       references auth.users (id) on delete cascade,
  nombre               text check (char_length(btrim(nombre)) between 2 and 60),
  celular              text check (celular ~ '^9[0-9]{8}$'),
  celular_verificado   boolean not null default false,
  cuenta_asegurada_en  timestamptz,
  zona_id              uuid references public.zonas (id) on delete set null,
  lat                  numeric(7,3) check (lat between -90 and 90),
  lng                  numeric(7,3) check (lng between -180 and 180),
  creado_en            timestamptz not null default now(),
  constraint perfiles_coordenadas_completas
    check ((lat is null) = (lng is null))
);

alter table public.perfiles add column if not exists celular_verificado  boolean not null default false;
alter table public.perfiles add column if not exists cuenta_asegurada_en timestamptz;

-- admins: se llena a mano desde el panel. La app no la lee ni escribe.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  creado_en  timestamptz not null default now()
);

-- servicios: solo el autor la lee; los demás usan servicios_publicos.
-- Lista cerrada de oficios: PROPUESTA, el equipo debe aprobarla.
create table if not exists public.servicios (
  id                     uuid primary key default gen_random_uuid(),
  autor                  uuid not null default auth.uid()
                         references public.perfiles (id) on delete cascade,
  nombre_negocio         text check (char_length(btrim(nombre_negocio)) between 2 and 60),
  oficio                 text not null check (oficio in (
                           'cafeteria', 'bodega', 'panaderia', 'restaurante',
                           'mercado', 'farmacia', 'gasfitero', 'electricista',
                           'carpintero', 'albanil', 'pintor', 'cerrajero',
                           'costurera', 'zapatero', 'peluqueria', 'lavanderia',
                           'mecanico', 'tecnico_celulares', 'jardinero',
                           'mototaxi', 'cuidado_personas', 'clases_particulares',
                           'otro')),
  descripcion            text check (char_length(descripcion) <= 140),
  precio_desde           numeric(8,2) check (precio_desde >= 0),
  hora_apertura          time,
  hora_cierre            time,
  direccion              text check (char_length(direccion) <= 100),
  mostrar_direccion      boolean not null default false,
  contacto               text check (contacto ~ '^9[0-9]{8}$'),
  mostrar_telefono       boolean not null default false,
  lat                    numeric(7,3) check (lat between -90 and 90),
  lng                    numeric(7,3) check (lng between -180 and 180),
  zona_id                uuid not null references public.zonas (id),
  disponible_emergencia  boolean not null default false,
  oculto                 boolean not null default false,
  revisado_en            timestamptz,
  creado_en              timestamptz not null default now(),
  constraint servicios_coordenadas_completas check ((lat is null) = (lng is null)),
  constraint servicios_horario_completo
    check ((hora_apertura is null) = (hora_cierre is null))
);

alter table public.servicios add column if not exists revisado_en timestamptz;

-- vistos_buenos: un voto por vecino y servicio. Motivo con botones.
create table if not exists public.vistos_buenos (
  id                  uuid primary key default gen_random_uuid(),
  servicio_id         uuid not null references public.servicios (id) on delete cascade,
  vecino_id           uuid not null default auth.uid()
                      references public.perfiles (id) on delete cascade,
  motivo              text not null check (motivo in
                        ('trato_amable', 'buen_precio', 'confiable', 'viene_domicilio')),
  comentario          text check (char_length(comentario) <= 140),
  mostrar_comentario  boolean not null default false,
  creado_en           timestamptz not null default now(),
  constraint vistos_buenos_unico unique (servicio_id, vecino_id)
);

-- reportes: solo admin lee. Uno por vecino y servicio.
create table if not exists public.reportes (
  id           uuid primary key default gen_random_uuid(),
  servicio_id  uuid not null references public.servicios (id) on delete cascade,
  vecino_id    uuid not null default auth.uid()
               references public.perfiles (id) on delete cascade,
  motivo       text not null check (motivo in
                 ('estafa', 'datos_falsos', 'ofensivo', 'no_existe', 'otro')),
  creado_en    timestamptz not null default now(),
  constraint reportes_unico unique (servicio_id, vecino_id)
);

-- grupos_apoyo: brigadas y puntos de ayuda. Lectura sin sesión.
create table if not exists public.grupos_apoyo (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (char_length(nombre) between 2 and 80),
  tipo            text not null check (tipo in
                    ('brigada', 'bomberos', 'comisaria', 'salud',
                     'municipalidad', 'punto_seguro', 'otro')),
  contacto        text check (char_length(contacto) <= 20),
  direccion       text check (char_length(direccion) <= 100),
  lat             numeric(7,3) check (lat between -90 and 90),
  lng             numeric(7,3) check (lng between -180 and 180),
  zona_id         uuid references public.zonas (id) on delete set null,
  verificada      boolean not null default false,
  verificada_por  uuid references auth.users (id) on delete set null,
  creado_en       timestamptz not null default now(),
  constraint grupos_coordenadas_completas check ((lat is null) = (lng is null))
);

-- pedidos_ayuda: sin teléfono y sin coordenadas. Vencen a las 48 h.
create table if not exists public.pedidos_ayuda (
  id           uuid primary key default gen_random_uuid(),
  autor        uuid not null default auth.uid()
               references public.perfiles (id) on delete cascade,
  categoria    text not null check (categoria in
                 ('arreglos', 'compras', 'transporte', 'salud')),
  descripcion  text check (char_length(descripcion) <= 140),
  zona_id      uuid not null references public.zonas (id),
  estado       text not null default 'abierto'
               check (estado in ('abierto', 'atendido', 'cancelado')),
  creado_en    timestamptz not null default now(),
  expira_en    timestamptz not null default (now() + interval '48 hours')
);

-- ayudas_ofrecidas: solo se escribe con la función yo_ayudo.
create table if not exists public.ayudas_ofrecidas (
  id           uuid primary key default gen_random_uuid(),
  pedido_id    uuid not null references public.pedidos_ayuda (id) on delete cascade,
  ayudante_id  uuid not null default auth.uid()
               references public.perfiles (id) on delete cascade,
  creado_en    timestamptz not null default now(),
  constraint ayudas_unico unique (pedido_id, ayudante_id)
);

create index if not exists perfiles_zona_idx          on public.perfiles (zona_id);
create index if not exists servicios_autor_idx        on public.servicios (autor, creado_en);
create index if not exists servicios_zona_idx         on public.servicios (zona_id) where not oculto;
create index if not exists servicios_oficio_idx       on public.servicios (oficio) where not oculto;
create index if not exists vistos_servicio_idx        on public.vistos_buenos (servicio_id, creado_en desc);
create index if not exists vistos_vecino_idx          on public.vistos_buenos (vecino_id, creado_en);
create index if not exists reportes_servicio_idx      on public.reportes (servicio_id);
create index if not exists reportes_vecino_idx        on public.reportes (vecino_id, creado_en);
create index if not exists grupos_zona_idx            on public.grupos_apoyo (zona_id);
create index if not exists pedidos_zona_idx           on public.pedidos_ayuda (zona_id, expira_en) where estado = 'abierto';
create index if not exists pedidos_autor_idx          on public.pedidos_ayuda (autor, estado);
create index if not exists ayudas_ayudante_idx        on public.ayudas_ofrecidas (ayudante_id);
