-- 03_politicas.sql · Proyecto Barrio (app "Vecinos") · Módulo 1
-- Orden de ejecución: 3.º (después de 02_funciones.sql)
-- La sesión anónima de Supabase usa el rol authenticated.

alter table public.zonas            enable row level security;
alter table public.perfiles         enable row level security;
alter table public.admins           enable row level security;
alter table public.servicios        enable row level security;
alter table public.vistos_buenos    enable row level security;
alter table public.reportes         enable row level security;
alter table public.grupos_apoyo     enable row level security;
alter table public.pedidos_ayuda    enable row level security;
alter table public.ayudas_ofrecidas enable row level security;

revoke all on public.admins from anon, authenticated;
revoke insert, update, delete on all tables in schema public from anon;

drop policy if exists zonas_leer     on public.zonas;
drop policy if exists zonas_admin    on public.zonas;
create policy zonas_leer  on public.zonas for select to anon, authenticated using (true);
create policy zonas_admin on public.zonas for all    to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists perfiles_leer_propio    on public.perfiles;
drop policy if exists perfiles_crear_propio   on public.perfiles;
drop policy if exists perfiles_editar_propio  on public.perfiles;
create policy perfiles_leer_propio   on public.perfiles for select to authenticated
  using (id = auth.uid());
create policy perfiles_crear_propio  on public.perfiles for insert to authenticated
  with check (id = auth.uid());
create policy perfiles_editar_propio on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists servicios_leer    on public.servicios;
drop policy if exists servicios_crear   on public.servicios;
drop policy if exists servicios_editar  on public.servicios;
drop policy if exists servicios_borrar  on public.servicios;
create policy servicios_leer   on public.servicios for select to authenticated
  using (autor = auth.uid() or public.es_admin());
create policy servicios_crear  on public.servicios for insert to authenticated
  with check (autor = auth.uid() and public.perfil_completo());
create policy servicios_editar on public.servicios for update to authenticated
  using (autor = auth.uid() or public.es_admin())
  with check (autor = auth.uid() or public.es_admin());
create policy servicios_borrar on public.servicios for delete to authenticated
  using (autor = auth.uid() or public.es_admin());

-- Mejora futura (sección 17): exigir cuenta protegida para publicar.
-- create policy servicios_solo_cuenta_protegida on public.servicios
--   as restrictive for insert to authenticated
--   with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is false);

drop policy if exists vistos_leer_propio  on public.vistos_buenos;
drop policy if exists vistos_crear        on public.vistos_buenos;
drop policy if exists vistos_retirar      on public.vistos_buenos;
create policy vistos_leer_propio on public.vistos_buenos for select to authenticated
  using (vecino_id = auth.uid() or public.es_admin());
create policy vistos_crear       on public.vistos_buenos for insert to authenticated
  with check (vecino_id = auth.uid() and public.perfil_completo());
create policy vistos_retirar     on public.vistos_buenos for delete to authenticated
  using (vecino_id = auth.uid() or public.es_admin());

drop policy if exists reportes_leer_admin   on public.reportes;
drop policy if exists reportes_crear        on public.reportes;
drop policy if exists reportes_borrar_admin on public.reportes;
create policy reportes_leer_admin   on public.reportes for select to authenticated
  using (public.es_admin());
create policy reportes_crear        on public.reportes for insert to authenticated
  with check (vecino_id = auth.uid() and public.perfil_completo());
create policy reportes_borrar_admin on public.reportes for delete to authenticated
  using (public.es_admin());

drop policy if exists grupos_leer  on public.grupos_apoyo;
drop policy if exists grupos_admin on public.grupos_apoyo;
create policy grupos_leer  on public.grupos_apoyo for select to anon, authenticated using (true);
create policy grupos_admin on public.grupos_apoyo for all    to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists pedidos_leer         on public.pedidos_ayuda;
drop policy if exists pedidos_crear        on public.pedidos_ayuda;
drop policy if exists pedidos_editar       on public.pedidos_ayuda;
drop policy if exists pedidos_borrar_admin on public.pedidos_ayuda;
create policy pedidos_leer   on public.pedidos_ayuda for select to authenticated
  using (autor = auth.uid() or public.es_admin());
create policy pedidos_crear  on public.pedidos_ayuda for insert to authenticated
  with check (autor = auth.uid() and public.perfil_completo());
create policy pedidos_editar on public.pedidos_ayuda for update to authenticated
  using (autor = auth.uid()) with check (autor = auth.uid());
create policy pedidos_borrar_admin on public.pedidos_ayuda for delete to authenticated
  using (public.es_admin());

drop policy if exists ayudas_leer on public.ayudas_ofrecidas;
create policy ayudas_leer on public.ayudas_ofrecidas for select to authenticated
  using (
    ayudante_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.pedidos_ayuda pa
               where pa.id = pedido_id and pa.autor = auth.uid())
  );
