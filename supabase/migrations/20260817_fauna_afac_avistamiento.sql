-- ============================================================================
-- Notificación de Avistamiento de Fauna — forma oficial AFAC-SA-FAUNA-A/ene-22
-- Agencia Federal de Aviación Civil · Dirección Ejecutiva de Seguridad Aérea
--
-- A diferencia de la notificación de impacto, este formato NO se replica en
-- public.fauna_reports ni alimenta las estadísticas del módulo de Fauna:
-- vive por completo en public.fauna_afac_avistamiento.
--
-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).
-- Es idempotente: puede correrse varias veces sin efectos colaterales.
-- ============================================================================

-- ── 1. Tabla principal ──────────────────────────────────────────────────────
create table if not exists public.fauna_afac_avistamiento (
    id uuid primary key default gen_random_uuid(),
    folio text not null,

    -- Casillas 1-2 · Momento del avistamiento
    fecha_evento          date,
    hora_evento           text,   -- formato oficial de 12 h (hh:mm)
    meridiano             text,   -- AM | PM
    hora_evento_24h       text,   -- normalizada, para consultas por hora

    -- Casilla 3
    luz_solar             text,   -- Amanecer | Día | Anochecer | Noche

    -- Casillas 4-7 · Lugar del avistamiento
    aerodromo             text,   -- código OACI (AIFA = MMSM)
    altura_agl            text,   -- pies; admite "N/A" para fauna terrestre
    ubicacion_aerodromo   text,
    ubicacion_ruta        text,

    -- Casillas 8-9 · Hallazgos y consecuencias
    restos_fauna          boolean,
    restos_descripcion    text,
    efectos_operacion     boolean,
    efectos_descripcion   text,

    -- Casillas 10-13 · Meteorología
    condicion_cielo       text,   -- Despejado | Medio Nublado | Nublado
    precipitacion         text,   -- Niebla | Lluvia | Nieve | Ninguna
    temperatura           text,   -- Menor a 10°C | De 10°C a 20°C | Mayor a 20°C
    viento                text,   -- Calma | Ligero | Moderado | Fuerte

    -- Casillas 14-18 · Fauna avistada
    especie_fauna         text,
    tamano_ejemplares     text,   -- Pequeño(s) | Mediano(s) | Grande(s)
    caracteristicas       text,   -- casilla 16: sólo si no se conoce la especie
    ejemplares_avistados  text,   -- 1 | 2-10 | 11-100 | más de 100
    comportamiento        text,

    -- Casilla 19 · Probables atrayentes (códigos oficiales A, B, C, E, F, G)
    atrayentes            text[] not null default '{}',
    atrayentes_descripcion text,

    -- Casillas 20-23 · Quien requisita el formulario
    reportado_por         text,
    puesto                text,
    empresa               text,
    fecha_reporte         date,

    -- Apartado adicional AIFA (no forma parte de la forma oficial)
    ubicacion_lat         double precision,
    ubicacion_lng         double precision,
    ubicacion_texto       text,

    pdf_url               text,
    created_by            uuid default auth.uid(),
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

comment on table public.fauna_afac_avistamiento is
    'Notificación de Avistamiento de Fauna (forma AFAC-SA-FAUNA-A/ene-22): una fila por formato requisitado.';

comment on column public.fauna_afac_avistamiento.atrayentes is
    'Casilla 19. El formato oficial numera A, B, C, E, F, G (omite la D).';

-- ── 2. Columnas nuevas si la tabla ya existía ──────────────────────────────
alter table public.fauna_afac_avistamiento
    add column if not exists hora_evento_24h text,
    add column if not exists ubicacion_texto text,
    add column if not exists pdf_url text,
    add column if not exists updated_at timestamptz not null default now();

-- ── 3. Validaciones de dominio ─────────────────────────────────────────────
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'fauna_avist_meridiano_chk') then
        alter table public.fauna_afac_avistamiento
            add constraint fauna_avist_meridiano_chk
            check (meridiano is null or meridiano in ('AM', 'PM'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_avist_luz_solar_chk') then
        alter table public.fauna_afac_avistamiento
            add constraint fauna_avist_luz_solar_chk
            check (luz_solar is null or luz_solar in ('Amanecer', 'Día', 'Anochecer', 'Noche'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_avist_cielo_chk') then
        alter table public.fauna_afac_avistamiento
            add constraint fauna_avist_cielo_chk
            check (condicion_cielo is null or condicion_cielo in ('Despejado', 'Medio Nublado', 'Nublado'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_avist_precipitacion_chk') then
        alter table public.fauna_afac_avistamiento
            add constraint fauna_avist_precipitacion_chk
            check (precipitacion is null or precipitacion in ('Niebla', 'Lluvia', 'Nieve', 'Ninguna'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_avist_temperatura_chk') then
        alter table public.fauna_afac_avistamiento
            add constraint fauna_avist_temperatura_chk
            check (temperatura is null or temperatura in ('Menor a 10°C', 'De 10°C a 20°C', 'Mayor a 20°C'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_avist_viento_chk') then
        alter table public.fauna_afac_avistamiento
            add constraint fauna_avist_viento_chk
            check (viento is null or viento in (
                'Calma (0 kts)', 'Ligero (menor a 3 kts)',
                'Moderado (3 a 10 kts)', 'Fuerte (mayor a 10 kts)'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_avist_tamano_chk') then
        alter table public.fauna_afac_avistamiento
            add constraint fauna_avist_tamano_chk
            check (tamano_ejemplares is null or tamano_ejemplares in ('Pequeño(s)', 'Mediano(s)', 'Grande(s)'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_avist_ejemplares_chk') then
        alter table public.fauna_afac_avistamiento
            add constraint fauna_avist_ejemplares_chk
            check (ejemplares_avistados is null or ejemplares_avistados in ('1', '2-10', '11-100', 'más de 100'));
    end if;

    -- Casilla 16: si no se anotó la especie, deben describirse las características.
    if not exists (select 1 from pg_constraint where conname = 'fauna_avist_identificacion_chk') then
        alter table public.fauna_afac_avistamiento
            add constraint fauna_avist_identificacion_chk
            check (
                coalesce(nullif(btrim(especie_fauna), ''), nullif(btrim(caracteristicas), '')) is not null
            );
    end if;
end $$;

-- ── 4. Índices ─────────────────────────────────────────────────────────────
create index if not exists fauna_avist_fecha_evento_idx on public.fauna_afac_avistamiento (fecha_evento desc);
create index if not exists fauna_avist_especie_idx      on public.fauna_afac_avistamiento (especie_fauna);
create index if not exists fauna_avist_aerodromo_idx    on public.fauna_afac_avistamiento (aerodromo);
create unique index if not exists fauna_avist_folio_idx on public.fauna_afac_avistamiento (folio);
create index if not exists fauna_avist_atrayentes_idx   on public.fauna_afac_avistamiento using gin (atrayentes);

-- ── 5. updated_at automático ───────────────────────────────────────────────
create or replace function public.tg_fauna_avistamiento_touch()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists fauna_avistamiento_touch on public.fauna_afac_avistamiento;
create trigger fauna_avistamiento_touch
    before update on public.fauna_afac_avistamiento
    for each row execute function public.tg_fauna_avistamiento_touch();

-- ── 6. RLS: mismo criterio que el resto del módulo MHR ─────────────────────
alter table public.fauna_afac_avistamiento enable row level security;

drop policy if exists fauna_avist_select_mhr on public.fauna_afac_avistamiento;
create policy fauna_avist_select_mhr on public.fauna_afac_avistamiento
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

drop policy if exists fauna_avist_insert_mhr on public.fauna_afac_avistamiento;
create policy fauna_avist_insert_mhr on public.fauna_afac_avistamiento
    for insert to authenticated
    with check (
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

drop policy if exists fauna_avist_update_mhr on public.fauna_afac_avistamiento;
create policy fauna_avist_update_mhr on public.fauna_afac_avistamiento
    for update to authenticated
    using (public.mhr_is_admin() or created_by = auth.uid())
    with check (public.mhr_is_admin() or created_by = auth.uid());

drop policy if exists fauna_avist_delete_admin on public.fauna_afac_avistamiento;
create policy fauna_avist_delete_admin on public.fauna_afac_avistamiento
    for delete to authenticated
    using (public.mhr_is_admin());

-- ── 7. Vista de consulta (listado legible, sin fines estadísticos) ─────────
create or replace view public.vw_fauna_afac_avistamiento as
select id,
       folio,
       coalesce(fecha_evento, fecha_reporte) as fecha,
       hora_evento,
       meridiano,
       luz_solar,
       aerodromo,
       coalesce(nullif(btrim(especie_fauna), ''), 'No identificada') as especie,
       tamano_ejemplares,
       ejemplares_avistados,
       restos_fauna,
       efectos_operacion,
       array_to_string(atrayentes, ', ')     as atrayentes_codigos,
       reportado_por,
       puesto,
       ubicacion_lat,
       ubicacion_lng,
       pdf_url,
       created_at
from public.fauna_afac_avistamiento
order by coalesce(fecha_evento, fecha_reporte) desc, created_at desc;

notify pgrst, 'reload schema';
