-- ============================================================================
-- Historial de Seguridad Operacional: lectura para todo el equipo MHR
--
-- Editores y visualizadores deben poder consultar el historial de reportes.
-- Modificar o eliminar sigue reservado, de modo que un visualizador vea todo
-- pero no pueda alterar nada.
--
-- Resumen de lo que queda vigente sobre public.reports:
--   SELECT  → cualquier integrante activo de MHR (o administrador)
--   INSERT  → integrantes activos
--   UPDATE  → administrador, o el autor si la fila registra quién la creó
--   DELETE  → sólo administrador
--
-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).
-- Es idempotente: puede correrse varias veces sin efectos colaterales.
-- ============================================================================

-- ── 1. Condición reutilizable de pertenencia a MHR ─────────────────────────
create or replace function public.mhr_es_miembro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.mhr_is_admin()
        or exists (
            select 1
            from public.usuarios_aplicaciones ua
            join public.aplicaciones a on a.id = ua.aplicacion_id
            where ua.usuario_id = auth.uid()
              and a.clave = 'MHR'
              and ua.estado = 'ACTIVO'
        );
$$;

comment on function public.mhr_es_miembro() is
    'Verdadero si el usuario autenticado tiene membresía activa en MHR o es administrador.';

-- ── 2. Lectura del historial ───────────────────────────────────────────────
-- Se eliminan las variantes previas para no dejar políticas superpuestas.
drop policy if exists reports_select_own on public.reports;
drop policy if exists reports_select_mhr on public.reports;
create policy reports_select_mhr on public.reports
    for select to authenticated
    using (public.mhr_es_miembro());

drop policy if exists report_inspection_items_select_own on public.report_inspection_items;
drop policy if exists report_inspection_items_select_mhr on public.report_inspection_items;
create policy report_inspection_items_select_mhr on public.report_inspection_items
    for select to authenticated
    using (public.mhr_es_miembro());

-- Las fotos de los hallazgos se consultan desde el mismo historial.
do $$
begin
    if exists (
        select 1 from information_schema.tables
         where table_schema = 'public' and table_name = 'report_inspection_item_photos'
    ) then
        execute 'drop policy if exists report_inspection_item_photos_select_own on public.report_inspection_item_photos';
        execute 'drop policy if exists report_inspection_item_photos_select_mhr on public.report_inspection_item_photos';
        execute 'create policy report_inspection_item_photos_select_mhr
                 on public.report_inspection_item_photos
                 for select to authenticated
                 using (public.mhr_es_miembro())';
        raise notice 'Lectura de fotos abierta al equipo MHR';
    end if;
end $$;

-- ── 3. Escritura: un visualizador no puede alterar nada ────────────────────
-- La captura no exige user_id: el formulario de revisión no envía esa columna
-- (la llena la base). Condicionarla aquí rompería el alta de reportes.
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
    for insert to authenticated
    with check (public.mhr_es_miembro());

-- Modificar: administradores siempre; el autor sólo si la fila tiene registrado
-- quién la creó. Así nunca se bloquea a un administrador ni se abre de más.
do $$
declare
    tiene_autor boolean := exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'reports' and column_name = 'user_id'
    );
begin
    execute 'drop policy if exists reports_update_own on public.reports';
    execute 'drop policy if exists mhr_reports_admin_update on public.reports';

    if tiene_autor then
        execute 'create policy reports_update_own on public.reports
                 for update to authenticated
                 using (public.mhr_is_admin() or (user_id is not null and user_id = auth.uid()))
                 with check (public.mhr_is_admin() or (user_id is not null and user_id = auth.uid()))';
    else
        execute 'create policy mhr_reports_admin_update on public.reports
                 for update to authenticated
                 using (public.mhr_is_admin()) with check (public.mhr_is_admin())';
    end if;
end $$;

-- Eliminar un reporte del historial sigue siendo exclusivo de administradores.
drop policy if exists mhr_reports_admin_delete on public.reports;
create policy mhr_reports_admin_delete on public.reports
    for delete to authenticated
    using (public.mhr_is_admin());

notify pgrst, 'reload schema';
