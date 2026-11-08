-- =====================================================================
-- 09_datos_demo.sql · Proyecto Barrio (app "Vecinos")
-- Orden de ejecución: 9.º, DESPUÉS de 08_ajustes_backend.sql.
-- Lo ejecuta Karla en el editor SQL de Supabase.
-- Se puede ejecutar más de una vez. Todo el archivo es una transacción.
--
-- Qué crea (datos ficticios, zona Cercado de Ica):
--   · 25 negocios, uno por cada oficio que permite el script 07,
--     con horario, teléfono visible y visible_vecinos en verdadero.
--     El oficio gasfitero queda como "Gasfitero Don Lucho" para la búsqueda.
--   · 6 publicaciones de comunidad, una por categoría.
--   · 1 pedido de ayuda abierto, categoría arreglos, que vence en 48 horas.
--
-- Autores: no se crea ningún usuario. perfiles.id referencia auth.users
-- y este script no escribe en auth.users. Usa el perfil completo más
-- antiguo del Cercado; si no hay uno en esa zona, el perfil completo
-- más antiguo de cualquier zona. Si no existe ninguno, se detiene con
-- SIN_AUTOR_DEMO: hay que entrar una vez en la app (eso crea el perfil)
-- y volver a ejecutar este archivo.
--
-- Desde el editor SQL auth.uid() es nulo, así que los triggers de límite
-- no rellenan autor ni zona. Este archivo pone autor, zona_id, oculto,
-- estado y expira_en. Los id son fijos: al repetir la ejecución se
-- actualizan las mismas filas y el pedido vuelve a vencer en 48 horas.
-- Para verlos en la app, el perfil de quien mira tiene que estar en el
-- Cercado: las vistas filtran por mi_zona().
-- =====================================================================

begin;

do $$
declare
  zona  uuid := '11111111-0000-4000-8000-000000000001';
  autor uuid;
begin
  if not exists (select 1 from public.zonas where id = zona) then
    raise exception 'Falta la zona Cercado de Ica. Ejecuta antes 04_datos_prueba.sql.';
  end if;

  select p.id into autor
  from public.perfiles p
  where p.zona_id = zona
    and nullif(btrim(p.nombre), '') is not null
    and p.celular is not null
  order by p.creado_en
  limit 1;

  if autor is null then
    select p.id into autor
    from public.perfiles p
    where nullif(btrim(p.nombre), '') is not null
      and p.celular is not null
    order by p.creado_en
    limit 1;
  end if;

  if autor is null then
    raise exception 'SIN_AUTOR_DEMO: no hay un perfil completo. perfiles.id referencia auth.users y este script no crea usuarios. Entra una vez en la app y vuelve a ejecutar 09_datos_demo.sql.';
  end if;

  insert into public.servicios (
    id, autor, nombre_negocio, oficio, descripcion, precio_desde,
    hora_apertura, hora_cierre, direccion, mostrar_direccion,
    contacto, mostrar_telefono, lat, lng, zona_id,
    disponible_emergencia, oculto, visible_vecinos
  ) values
    ('33333333-0000-4000-8000-000000000001', autor, 'Café La Esquina', 'cafeteria',
      'Café de la esquina, para tomar aquí.', 5, '07:00', '21:00',
      'Calle 1 Nro 10', true, '900111001', true, -14.068, -75.728, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000002', autor, 'Bodega El Parque', 'bodega',
      'Abarrotes y recargas, al paso.', 2, '07:00', '22:00',
      'Calle 1 Nro 20', true, '900111002', true, -14.067, -75.728, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000003', autor, 'Panadería La Masa', 'panaderia',
      'Pan fresco por las mañanas.', 1, '06:00', '20:00',
      'Calle 2 Nro 10', true, '900111003', true, -14.069, -75.728, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000004', autor, 'Restaurante El Huerto', 'restaurante',
      'Menú casero al paso, de lunes a sábado.', 12, '11:00', '16:00',
      'Calle 2 Nro 20', true, '900111004', true, -14.068, -75.727, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000005', autor, 'Menú del Día Sol', 'menu',
      'Menú del día, entrada y segundo.', 10, '12:00', '15:00',
      'Calle 3 Nro 10', true, '900111005', true, -14.068, -75.729, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000006', autor, 'Puesto del Mercado', 'mercado',
      'Frutas y verduras de la zona.', 3, '06:00', '14:00',
      'Calle 3 Nro 20', true, '900111006', true, -14.066, -75.728, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000007', autor, 'Botica La Esquina', 'farmacia',
      'Botica de barrio, horario corrido.', 4, '08:00', '22:00',
      'Calle 4 Nro 10', true, '900111007', true, -14.070, -75.728, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000008', autor, 'Gasfitero Don Lucho', 'gasfitero',
      'Arreglo de caños y llaves en la zona.', 30, '08:00', '18:00',
      'Calle 4 Nro 20', true, '900111008', true, -14.067, -75.727, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000009', autor, 'Electricista Rayo', 'electricista',
      'Instalaciones simples de la casa.', 40, '08:00', '18:00',
      'Calle 5 Nro 10', true, '900111009', true, -14.067, -75.729, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000010', autor, 'Carpintería El Roble', 'carpintero',
      'Puertas y repisas a medida.', 50, '08:00', '17:00',
      'Calle 5 Nro 20', true, '900111010', true, -14.069, -75.727, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000011', autor, 'Albañil Muros', 'albanil',
      'Reparación de paredes y pisos.', 60, '08:00', '17:00',
      'Calle 6 Nro 10', true, '900111011', true, -14.069, -75.729, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000012', autor, 'Pintor Colores', 'pintor',
      'Pintura de cuartos y fachadas.', 45, '08:00', '17:00',
      'Calle 6 Nro 20', true, '900111012', true, -14.066, -75.727, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000013', autor, 'Cerrajero Llaves', 'cerrajero',
      'Apertura de puertas y copias de llave.', 25, '08:00', '20:00',
      'Calle 7 Nro 10', true, '900111013', true, -14.066, -75.729, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000014', autor, 'Costurera Hilo', 'costurera',
      'Arreglos de ropa y dobladillos.', 10, '09:00', '18:00',
      'Calle 7 Nro 20', true, '900111014', true, -14.070, -75.727, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000015', autor, 'Zapatería Suela', 'zapatero',
      'Cambio de suela y costura de zapatos.', 15, '09:00', '19:00',
      'Calle 8 Nro 10', true, '900111015', true, -14.070, -75.729, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000016', autor, 'Peluquería Corte', 'peluqueria',
      'Corte de pelo, con cita.', 15, '09:00', '19:00',
      'Calle 8 Nro 20', true, '900111016', true, -14.068, -75.726, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000017', autor, 'Lavandería Ropa', 'lavanderia',
      'Lavado por kilo, listo al día siguiente.', 8, '08:00', '18:00',
      'Calle 9 Nro 10', true, '900111017', true, -14.068, -75.730, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000018', autor, 'Taller Mecánico Freno', 'mecanico',
      'Revisión de frenos y cambios de aceite.', 40, '08:00', '18:00',
      'Calle 9 Nro 20', true, '900111018', true, -14.065, -75.728, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000019', autor, 'Taller de Celulares', 'tecnico_celulares',
      'Cambio de pantalla y batería.', 35, '10:00', '19:00',
      'Calle 10 Nro 10', true, '900111019', true, -14.071, -75.728, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000020', autor, 'Jardinero Verde', 'jardinero',
      'Corte de césped y plantas de la casa.', 25, '07:00', '16:00',
      'Calle 10 Nro 20', true, '900111020', true, -14.067, -75.726, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000021', autor, 'Mototaxi Barrio', 'mototaxi',
      'Pasajes cortos dentro de la zona.', 3, '06:00', '21:00',
      'Calle 11 Nro 10', true, '900111021', true, -14.067, -75.730, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000022', autor, 'Cuidado en Casa', 'cuidado_personas',
      'Acompañamiento de adultos mayores por horas.', 20, '08:00', '18:00',
      'Calle 11 Nro 20', true, '900111022', true, -14.069, -75.726, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000023', autor, 'Clases de Repaso', 'clases_particulares',
      'Repaso escolar por las tardes.', 20, '15:00', '19:00',
      'Calle 12 Nro 10', true, '900111023', true, -14.069, -75.730, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000024', autor, 'Agencia de Recibos', 'pago_servicios',
      'Lugar para pagar recibos de la casa. La app no cobra.', 0, '08:00', '18:00',
      'Calle 12 Nro 20', true, '900111024', true, -14.066, -75.726, zona, false, false, true),
    ('33333333-0000-4000-8000-000000000025', autor, 'Servicio Varios', 'otro',
      'Mandados y encargos pequeños de la zona.', 10, '08:00', '18:00',
      'Calle 13 Nro 10', true, '900111025', true, -14.066, -75.730, zona, false, false, true)
  on conflict (id) do update set
    autor = excluded.autor,
    nombre_negocio = excluded.nombre_negocio,
    oficio = excluded.oficio,
    descripcion = excluded.descripcion,
    precio_desde = excluded.precio_desde,
    hora_apertura = excluded.hora_apertura,
    hora_cierre = excluded.hora_cierre,
    direccion = excluded.direccion,
    mostrar_direccion = excluded.mostrar_direccion,
    contacto = excluded.contacto,
    mostrar_telefono = excluded.mostrar_telefono,
    lat = excluded.lat,
    lng = excluded.lng,
    zona_id = excluded.zona_id,
    disponible_emergencia = excluded.disponible_emergencia,
    oculto = excluded.oculto,
    visible_vecinos = excluded.visible_vecinos;

  insert into public.publicaciones (
    id, autor, zona_id, categoria, mensaje, oculto
  ) values
    ('44444444-0000-4000-8000-000000000001', autor, zona, 'kermes',
      'Kermés del parque el domingo. Hay comida y juegos para los niños.', false),
    ('44444444-0000-4000-8000-000000000002', autor, zona, 'misa',
      'Misa de la comunidad el domingo a las diez, en la capilla de la zona.', false),
    ('44444444-0000-4000-8000-000000000003', autor, zona, 'ayuda_social',
      'Recojo de víveres para una familia de la zona. Se deja en el local comunal.', false),
    ('44444444-0000-4000-8000-000000000004', autor, zona, 'donacion',
      'Se reciben frazadas y ropa de abrigo en buen estado, esta semana.', false),
    ('44444444-0000-4000-8000-000000000005', autor, zona, 'taller',
      'Taller de costura el sábado por la mañana. Los cupos son limitados.', false),
    ('44444444-0000-4000-8000-000000000006', autor, zona, 'otro',
      'Reunión de vecinos el viernes para organizar la limpieza de la calle.', false)
  on conflict (id) do update set
    autor = excluded.autor,
    zona_id = excluded.zona_id,
    categoria = excluded.categoria,
    mensaje = excluded.mensaje,
    oculto = excluded.oculto;

  insert into public.pedidos_ayuda (
    id, autor, categoria, descripcion, zona_id, estado, expira_en
  ) values (
    '55555555-0000-4000-8000-000000000001', autor, 'arreglos',
    'Se soltó la puerta del patio. Busco a alguien que la ajuste.',
    zona, 'abierto', now() + interval '48 hours'
  )
  on conflict (id) do update set
    autor = excluded.autor,
    categoria = excluded.categoria,
    descripcion = excluded.descripcion,
    zona_id = excluded.zona_id,
    estado = 'abierto',
    expira_en = now() + interval '48 hours';

  raise notice 'Datos demo listos. Autor usado: %', autor;
end $$;

commit;
