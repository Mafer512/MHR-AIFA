-- admin_update_user_profile y admin_delete_user tenían su propia validación de
-- rol (NOT IN ('admin','superuser') / IS DISTINCT FROM 'admin'), desactualizada
-- respecto a mhr_is_admin(). Un usuario con rol 'superadmin' quedaba bloqueado
-- por ambas funciones aunque sí tuviera privilegios de administrador.

create or replace function public.admin_update_user_profile(
    p_user_id uuid,
    p_full_name text default null::text,
    p_username text default null::text,
    p_cargo text default null::text
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    if not public.mhr_is_admin() then
        return json_build_object('ok', false, 'error', 'No autorizado');
    end if;

    insert into profiles (id, full_name, username, cargo)
    values (p_user_id, p_full_name, p_username, p_cargo)
    on conflict (id) do update set
        full_name = coalesce(excluded.full_name, profiles.full_name),
        username  = coalesce(excluded.username,  profiles.username),
        cargo     = coalesce(excluded.cargo,     profiles.cargo);

    return json_build_object('ok', true);
end;
$function$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
begin
    if not public.mhr_is_admin() then
        return jsonb_build_object('ok', false, 'error', 'Acceso denegado');
    end if;
    if p_user_id = auth.uid() then
        return jsonb_build_object('ok', false, 'error', 'No puedes eliminar tu propia cuenta');
    end if;

    delete from public.user_roles where user_id = p_user_id;
    delete from public.profiles where id = p_user_id;
    delete from auth.users where id = p_user_id;

    return jsonb_build_object('ok', true);
end;
$function$;

notify pgrst, 'reload schema';
