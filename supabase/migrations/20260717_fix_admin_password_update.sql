-- Corrige el cambio de contraseña desde el panel MHR.
create extension if not exists pgcrypto;

drop function if exists public.admin_update_user_password(uuid, text);

create or replace function public.admin_update_user_password(
    p_user_id uuid,
    p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    if not public.mhr_is_admin() then
        return jsonb_build_object('ok', false, 'error', 'No autorizado');
    end if;

    if p_password is null or length(p_password) < 6 then
        return jsonb_build_object('ok', false, 'error', 'La contraseña debe tener al menos 6 caracteres');
    end if;

    update auth.users
       set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
           updated_at = now()
     where id = p_user_id;

    if not found then
        return jsonb_build_object('ok', false, 'error', 'Usuario Auth no encontrado');
    end if;

    return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_update_user_password(uuid, text) from public;
grant execute on function public.admin_update_user_password(uuid, text) to authenticated;
