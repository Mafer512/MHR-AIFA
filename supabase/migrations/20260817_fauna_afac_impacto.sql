-- ============================================================================
-- Notificación de Impacto con Fauna — forma oficial AFAC-SA-FAUNA-I/ene-22
-- Agencia Federal de Aviación Civil · Dirección Ejecutiva de Seguridad Aérea
--
-- La captura del módulo de Fauna guarda cada notificación en dos lugares:
--   · public.fauna_reports      → columnas que ya alimentan estadísticas y mapa
--   · public.fauna_afac_impacto → las 28 casillas de la forma oficial
-- Ambas filas quedan ligadas por fauna_afac_impacto.fauna_report_id.
--
-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).
-- Es idempotente: puede correrse varias veces sin efectos colaterales.
-- ============================================================================

-- ── 1. Tabla principal ──────────────────────────────────────────────────────
create table if not exists public.fauna_afac_impacto (
    id uuid primary key default gen_random_uuid(),

    -- Vínculo con el reporte de fauna que alimenta estadísticas y mapa
    fauna_report_id uuid references public.fauna_reports(id) on delete cascade,
    folio text not null,

    -- Casillas 1-6 · Identificación de la aeronave
    explotador            text,
    marca_aeronave        text,
    modelo_aeronave       text,
    matricula             text,
    marca_motor           text,
    modelo_motor          text,

    -- Casillas 7-8 · Momento del evento
    fecha_evento          date,
    hora_evento           text,   -- formato oficial de 12 h (hh:mm)
    meridiano             text,   -- AM | PM
    hora_evento_24h       text,   -- normalizada para la estadística por hora

    -- Casilla 9
    luz_solar             text,   -- Amanecer | Día | Anochecer | Noche

    -- Casillas 10-14 · Lugar del evento
    aerodromo             text,   -- código OACI (AIFA = MMSM)
    pista_utilizada       text,
    ubicacion_ruta        text,
    altura_agl            integer,  -- pies sobre el terreno
    velocidad_ias         integer,  -- nudos

    -- Casilla 15
    fase_operacion        text,

    -- Casilla 16 · Se guardan los códigos oficiales A…N
    partes_impactadas     text[] not null default '{}',
    partes_danadas        text[] not null default '{}',
    partes_otro           text,

    -- Casilla 17
    efecto_operacion      text[] not null default '{}',
    efecto_otro           text,

    -- Casillas 18-19 · Meteorología
    condicion_cielo       text,   -- Despejado | Medio Nublado | Nublado
    precipitacion         text,   -- Niebla | Lluvia | Nieve | Ninguna

    -- Casillas 20-22 · Fauna
    especie_fauna         text,
    tamano_ejemplares     text,   -- Pequeño(s) | Mediano(s) | Grande(s)
    ejemplares_avistados  text,   -- 1 | 2-10 | 11-100 | más de 100
    ejemplares_impactados text,

    -- Casillas 23-24
    piloto_advertido      boolean,
    piloto_advertido_por  text,
    observaciones         text,

    -- Casillas 25-28 · Quien requisita el formulario
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

comment on table public.fauna_afac_impacto is
    'Notificación de Impacto con Fauna (forma AFAC-SA-FAUNA-I/ene-22): una fila por formato requisitado.';

-- ── 2. Columnas nuevas si la tabla ya existía ──────────────────────────────
alter table public.fauna_afac_impacto
    add column if not exists hora_evento_24h text,
    add column if not exists ubicacion_texto text,
    add column if not exists pdf_url text,
    add column if not exists updated_at timestamptz not null default now();

-- Marca de origen en fauna_reports para distinguir la captura AFAC
alter table public.fauna_reports
    add column if not exists origen text;

comment on column public.fauna_reports.origen is
    'Formulario de captura que originó el registro (p. ej. AFAC).';

-- ── 3. Validaciones de dominio ─────────────────────────────────────────────
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'fauna_afac_meridiano_chk') then
        alter table public.fauna_afac_impacto
            add constraint fauna_afac_meridiano_chk
            check (meridiano is null or meridiano in ('AM', 'PM'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_afac_luz_solar_chk') then
        alter table public.fauna_afac_impacto
            add constraint fauna_afac_luz_solar_chk
            check (luz_solar is null or luz_solar in ('Amanecer', 'Día', 'Anochecer', 'Noche'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_afac_cielo_chk') then
        alter table public.fauna_afac_impacto
            add constraint fauna_afac_cielo_chk
            check (condicion_cielo is null or condicion_cielo in ('Despejado', 'Medio Nublado', 'Nublado'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_afac_precipitacion_chk') then
        alter table public.fauna_afac_impacto
            add constraint fauna_afac_precipitacion_chk
            check (precipitacion is null or precipitacion in ('Niebla', 'Lluvia', 'Nieve', 'Ninguna'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_afac_tamano_chk') then
        alter table public.fauna_afac_impacto
            add constraint fauna_afac_tamano_chk
            check (tamano_ejemplares is null or tamano_ejemplares in ('Pequeño(s)', 'Mediano(s)', 'Grande(s)'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_afac_avistados_chk') then
        alter table public.fauna_afac_impacto
            add constraint fauna_afac_avistados_chk
            check (ejemplares_avistados is null or ejemplares_avistados in ('1', '2-10', '11-100', 'más de 100'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'fauna_afac_impactados_chk') then
        alter table public.fauna_afac_impacto
            add constraint fauna_afac_impactados_chk
            check (ejemplares_impactados is null or ejemplares_impactados in ('1', '2-10', '11-100', 'más de 100'));
    end if;
end $$;

-- ── 4. Índices para los filtros de la estadística ──────────────────────────
create index if not exists fauna_afac_fecha_evento_idx  on public.fauna_afac_impacto (fecha_evento desc);
create index if not exists fauna_afac_explotador_idx    on public.fauna_afac_impacto (explotador);
create index if not exists fauna_afac_especie_idx       on public.fauna_afac_impacto (especie_fauna);
create index if not exists fauna_afac_fase_idx          on public.fauna_afac_impacto (fase_operacion);
create index if not exists fauna_afac_report_id_idx     on public.fauna_afac_impacto (fauna_report_id);
create unique index if not exists fauna_afac_folio_idx  on public.fauna_afac_impacto (folio);
create index if not exists fauna_afac_partes_imp_idx    on public.fauna_afac_impacto using gin (partes_impactadas);
create index if not exists fauna_afac_partes_dan_idx    on public.fauna_afac_impacto using gin (partes_danadas);

-- ── 5. updated_at automático ───────────────────────────────────────────────
create or replace function public.tg_fauna_afac_touch()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists fauna_afac_touch on public.fauna_afac_impacto;
create trigger fauna_afac_touch
    before update on public.fauna_afac_impacto
    for each row execute function public.tg_fauna_afac_touch();

-- ── 6. RLS: mismo criterio que el resto del módulo MHR ─────────────────────
-- Lectura para cualquier integrante activo de MHR (o administrador);
-- escritura para integrantes activos; borrado sólo para administradores.
alter table public.fauna_afac_impacto enable row level security;

drop policy if exists fauna_afac_select_mhr on public.fauna_afac_impacto;
create policy fauna_afac_select_mhr on public.fauna_afac_impacto
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

drop policy if exists fauna_afac_insert_mhr on public.fauna_afac_impacto;
create policy fauna_afac_insert_mhr on public.fauna_afac_impacto
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

drop policy if exists fauna_afac_update_mhr on public.fauna_afac_impacto;
create policy fauna_afac_update_mhr on public.fauna_afac_impacto
    for update to authenticated
    using (public.mhr_is_admin() or created_by = auth.uid())
    with check (public.mhr_is_admin() or created_by = auth.uid());

drop policy if exists fauna_afac_delete_admin on public.fauna_afac_impacto;
create policy fauna_afac_delete_admin on public.fauna_afac_impacto
    for delete to authenticated
    using (public.mhr_is_admin());

-- ── 7. Vistas de apoyo para la estadística ─────────────────────────────────

-- 7.1 Una fila por parte de la aeronave afectada (casilla 16), ya con el
--     nombre oficial de la parte, lista para graficar.
create or replace view public.vw_fauna_afac_partes as
with catalogo(codigo, nombre) as (
    values ('A', 'Radomo'), ('B', 'Parabrisas'), ('C', 'Sección de Nariz (Excepto A y B)'),
           ('D', 'Motor No. 1'), ('E', 'Motor No. 2'), ('F', 'Motor No. 3'), ('G', 'Motor No. 4'),
           ('H', 'Hélice'), ('I', 'Ala/Rotor'), ('J', 'Fuselaje'), ('K', 'Tren de Aterrizaje'),
           ('L', 'Sección de Cola'), ('M', 'Luces'), ('N', 'Otro')
)
select r.id,
       r.folio,
       r.fecha_evento,
       r.explotador,
       c.codigo                      as parte_codigo,
       c.nombre                      as parte_nombre,
       c.codigo = any(r.partes_impactadas) as impactada,
       c.codigo = any(r.partes_danadas)    as danada
from public.fauna_afac_impacto r
cross join catalogo c
where c.codigo = any(r.partes_impactadas)
   or c.codigo = any(r.partes_danadas);

-- 7.2 Resumen mensual: volumen, daños y efecto en la operación.
create or replace view public.vw_fauna_afac_resumen_mensual as
select date_trunc('month', coalesce(fecha_evento, fecha_reporte))::date as mes,
       count(*)                                                          as notificaciones,
       count(*) filter (where array_length(partes_danadas, 1) > 0)       as con_dano,
       count(*) filter (
           where array_length(efecto_operacion, 1) > 0
             and efecto_operacion <> array['Ninguno']::text[]
       )                                                                 as con_efecto_operacion,
       count(*) filter (where piloto_advertido)                          as piloto_advertido,
       round(avg(altura_agl))                                            as altura_agl_promedio,
       round(avg(velocidad_ias))                                         as velocidad_ias_promedio
from public.fauna_afac_impacto
group by 1
order by 1 desc;

-- 7.3 Especies con mayor incidencia de impacto.
create or replace view public.vw_fauna_afac_especies as
select especie_fauna,
       tamano_ejemplares,
       count(*)                                                    as impactos,
       count(*) filter (where array_length(partes_danadas, 1) > 0) as con_dano,
       max(coalesce(fecha_evento, fecha_reporte))                  as ultimo_evento
from public.fauna_afac_impacto
where especie_fauna is not null and especie_fauna <> ''
group by 1, 2
order by impactos desc;

notify pgrst, 'reload schema';
