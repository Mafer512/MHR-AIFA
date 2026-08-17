-- admin_update_user_role (el selector de rol en la lista del panel) solo
-- escribía en public.user_roles (rol global, compartido con Operaciones).
-- El login prioriza public.usuarios_aplicaciones.rol (rol específico de MHR)
-- sobre user_roles, así que un cambio de rol desde el panel nunca se veía
-- reflejado al iniciar sesión. Ahora se mantienen sincronizadas.

create or replace function public.admin_update_user_role(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    caller_role text;
    _valid      boolean;
    _mhr_app    uuid;
begin
    select role into caller_role
    from public.user_roles
    where user_id = auth.uid();

    if caller_role is null or caller_role not in ('admin','superadmin') then
        return jsonb_build_object('ok', false, 'error', 'Acceso denegado: solo admin/superadmin puede cambiar roles');
    end if;

    _valid := p_role in (
        'admin','superadmin','editor','capturista','lector',
        'viewer','colab_viewer','colab_editor','control_fauna','servicio_medico'
    ) or exists (select 1 from public.areas where clave = p_role and estado = 'ACTIVO');

    if not _valid then
        return jsonb_build_object('ok', false, 'error', 'Rol inválido: ' || p_role);
    end if;

    insert into public.user_roles (user_id, role, permissions)
    values (p_user_id, p_role, '{}'::jsonb)
    on conflict (user_id) do update set role = excluded.role;

    -- Sincronizar el rol de la membresía MHR si el usuario ya pertenece a MHR.
    -- No se inserta una membresía nueva: este selector no debe otorgar acceso
    -- a MHR por sí solo.
    select id into _mhr_app from public.aplicaciones where clave = 'MHR';
    if _mhr_app is not null then
        update public.usuarios_aplicaciones
           set rol = p_role, updated_at = now()
         where usuario_id = p_user_id
           and aplicacion_id = _mhr_app;
    end if;

    return jsonb_build_object('ok', true, 'role', p_role);
end;
$function$;

notify pgrst, 'reload schema';
