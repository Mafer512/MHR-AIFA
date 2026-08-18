-- ============================================================================
-- Sello del autor de los reportes
--
-- El nombre y el puesto de quien elabora un reporte se toman de la identidad
-- autenticada, no de lo que envíe el navegador. Así nadie puede registrar un
-- reporte a nombre de otra persona, ni siquiera alterando el formulario desde
-- las herramientas del navegador.
--
-- La interfaz ya deja esos campos fijos (js/ui/identity-lock.js); esta
-- migración es la garantía real, del lado del servidor.
--
-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).
-- Es idempotente: puede correrse varias veces sin efectos colaterales.
-- ============================================================================

-- ── 1. Resolver la identidad de la sesión ──────────────────────────────────
-- Devuelve el nombre y el puesto del usuario autenticado. Se apoya en
-- public.profiles y, si ahí no hay nombre, recurre a auth.users.
create or replace function public.mhr_identidad_sesion(
    out nombre text,
    out cargo  text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
    nombre := null;
    cargo  := null;

    if auth.uid() is null then
        return;
    end if;

    select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.username), '')),
           nullif(btrim(p.cargo), '')
      into nombre, cargo
      from public.profiles p
     where p.id = auth.uid();

    if nombre is null then
        select coalesce(
                 nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
                 nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
                 u.email
               )
          into nombre
          from auth.users u
         where u.id = auth.uid();
    end if;
end;
$$;

comment on function public.mhr_identidad_sesion() is
    'Nombre y puesto del usuario autenticado, para sellar la autoría de los reportes.';

-- ── 2. Disparador genérico ─────────────────────────────────────────────────
-- Recibe como argumentos el nombre de la columna del responsable y el de la
-- columna del puesto, porque cada formato los llama distinto.
create or replace function public.mhr_sellar_autor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    col_nombre text := TG_ARGV[0];
    col_cargo  text := TG_ARGV[1];
    v_nombre   text;
    v_cargo    text;
    parche     jsonb := '{}'::jsonb;
begin
    if auth.uid() is null then
        raise exception 'Se requiere una sesión activa para registrar el reporte.'
            using errcode = '28000';
    end if;

    select nombre, cargo into v_nombre, v_cargo from public.mhr_identidad_sesion();

    -- El responsable siempre se reescribe con la identidad autenticada.
    if v_nombre is not null and col_nombre is not null and col_nombre <> '' then
        parche := parche || jsonb_build_object(col_nombre, v_nombre);
    end if;

    -- El puesto sólo se impone cuando el perfil lo tiene registrado; si no,
    -- se respeta lo capturado para no dejar el reporte incompleto.
    if v_cargo is not null and col_cargo is not null and col_cargo <> '' then
        parche := parche || jsonb_build_object(col_cargo, v_cargo);
    end if;

    if parche <> '{}'::jsonb then
        new := jsonb_populate_record(new, parche);
    end if;

    return new;
end;
$$;

comment on function public.mhr_sellar_autor() is
    'Reescribe el responsable (y el puesto) del reporte con la identidad autenticada.';

-- ── 3. Aplicar a cada tabla de reportes ────────────────────────────────────
do $$
declare
    t record;
begin
    for t in
        select * from (values
            ('reports',                  'responsable',   'cargo'),
            ('fauna_reports',            'responsable',   'cargo'),
            ('fauna_afac_impacto',       'reportado_por', 'puesto'),
            ('fauna_afac_avistamiento',  'reportado_por', 'puesto')
        ) as v(tabla, col_nombre, col_cargo)
    loop
        -- Sólo si la tabla y ambas columnas existen (las de fauna AFAC
        -- dependen de que ya se hayan aplicado sus migraciones).
        if exists (
            select 1 from information_schema.columns
             where table_schema = 'public' and table_name = t.tabla and column_name = t.col_nombre
        ) then
            execute format('drop trigger if exists %I on public.%I',
                           'sellar_autor_' || t.tabla, t.tabla);
            execute format(
                'create trigger %I before insert on public.%I
                 for each row execute function public.mhr_sellar_autor(%L, %L)',
                'sellar_autor_' || t.tabla, t.tabla, t.col_nombre, t.col_cargo);
            raise notice 'Sello de autor aplicado a public.%', t.tabla;
        else
            raise notice 'Se omite public.% (aún no existe)', t.tabla;
        end if;
    end loop;
end $$;

notify pgrst, 'reload schema';
