-- reports_select_own / report_inspection_items_select_own limitaban la
-- lectura a "user_id = auth.uid()": cada usuario solo veía sus propios
-- reportes. Esto dejaba vacíos el Historial SO y las Estadísticas
-- (incluido el mapa de hallazgos) para cualquiera que no fuera el autor
-- original del reporte, sin importar su rol.
--
-- Se amplía la lectura a cualquier usuario con membresía activa en MHR
-- (o rol admin/superuser/superadmin), igual que ya se validaba en el login.
-- Los permisos de insertar/editar/eliminar (own) no cambian.

drop policy if exists reports_select_own on public.reports;
create policy reports_select_mhr on public.reports
    for select to authenticated
    using (
        public.mhr_is_admin()
        or exists (
            select 1
            from public.usuarios_aplicaciones ua
            join public.aplicaciones a on a.id = ua.aplicacion_id
            where ua.usuario_id = auth.uid()
              and a.clave = 'MHR'
              and ua.estado = 'ACTIVO'
        )
    );

drop policy if exists report_inspection_items_select_own on public.report_inspection_items;
create policy report_inspection_items_select_mhr on public.report_inspection_items
    for select to authenticated
    using (
        public.mhr_is_admin()
        or exists (
            select 1
            from public.usuarios_aplicaciones ua
            join public.aplicaciones a on a.id = ua.aplicacion_id
            where ua.usuario_id = auth.uid()
              and a.clave = 'MHR'
              and ua.estado = 'ACTIVO'
        )
    );

notify pgrst, 'reload schema';
