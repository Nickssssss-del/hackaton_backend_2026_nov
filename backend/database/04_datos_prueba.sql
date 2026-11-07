-- 04_datos_prueba.sql · Proyecto Barrio (app "Vecinos") · Módulo 1
-- Orden de ejecución: 4.º
-- Zonas de Ica, una brigada verificada y grupos de apoyo ficticios.
-- Los usuarios anónimos no se siembran aquí.

insert into public.zonas (id, nombre, distrito, lat_centro, lng_centro, radio_m) values
  ('11111111-0000-4000-8000-000000000001', 'Cercado de Ica', 'Ica',         -14.068, -75.728, 2500),
  ('11111111-0000-4000-8000-000000000002', 'La Tinguiña',    'La Tinguiña', -14.034, -75.711, 2000),
  ('11111111-0000-4000-8000-000000000003', 'Parcona',        'Parcona',     -14.045, -75.698, 2000),
  ('11111111-0000-4000-8000-000000000004', 'Subtanjalla',    'Subtanjalla', -14.019, -75.758, 2000),
  ('11111111-0000-4000-8000-000000000005', 'Los Aquijes',    'Los Aquijes', -14.097, -75.691, 2000),
  ('11111111-0000-4000-8000-000000000006', 'San Joaquín',    'Ica',         -14.080, -75.745, 1500)
on conflict (id) do nothing;

insert into public.grupos_apoyo (id, nombre, tipo, contacto, direccion, lat, lng, zona_id, verificada) values
  ('22222222-0000-4000-8000-000000000001', 'Brigada Vecinal Cercado (ficticia)', 'brigada',
     '900000001', 'Plaza de Armas de Ica (referencia)', -14.064, -75.727,
     '11111111-0000-4000-8000-000000000001', true),
  ('22222222-0000-4000-8000-000000000002', 'Punto seguro Parque (ficticio)', 'punto_seguro',
     null, 'Parque de referencia', -14.070, -75.732,
     '11111111-0000-4000-8000-000000000001', true),
  ('22222222-0000-4000-8000-000000000003', 'Brigada La Tinguiña (ficticia, sin verificar)', 'brigada',
     '900000002', null, -14.034, -75.712,
     '11111111-0000-4000-8000-000000000002', false)
on conflict (id) do nothing;

-- El admin se crea a mano:
-- insert into public.admins (user_id) values ('<id-de-tu-usuario>');
