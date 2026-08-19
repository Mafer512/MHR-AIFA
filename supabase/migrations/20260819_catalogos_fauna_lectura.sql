-- ============================================================================
-- Catálogos de Fauna: existencia, lectura y datos base
--
-- Los desplegables de Clase, Especie y Sitio de Reubicación se alimentan de
-- public.catalogo_clase, public.catalogo_especie y public.catalogo_destino.
-- Esas tablas se crearon fuera del control de versiones, así que esta
-- migración las deja en un estado conocido sin pisar lo que ya exista:
--
--   · Crea la tabla sólo si falta.
--   · Agrega las columnas que el frontend necesita (activo, orden) si faltan.
--   · Abre la lectura a cualquier integrante activo de MHR y reserva la
--     escritura a administradores.
--   · Siembra valores base únicamente si la tabla quedó vacía.
--
-- El frontend consulta: select id, nombre where activo = true order by orden
--
-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).
-- Es idempotente: puede correrse varias veces sin efectos colaterales.
-- ============================================================================

-- ── 1. Tablas ──────────────────────────────────────────────────────────────
create table if not exists public.catalogo_clase (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    activo boolean not null default true,
    orden integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.catalogo_destino (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    activo boolean not null default true,
    orden integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.catalogo_especie (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    clase_id uuid references public.catalogo_clase(id) on delete set null,
    activo boolean not null default true,
    orden integer not null default 0,
    created_at timestamptz not null default now()
);

comment on table public.catalogo_clase   is 'Clases de fauna (Ave, Mamífero, …) para el módulo de Fauna.';
comment on table public.catalogo_especie is 'Especies de fauna, opcionalmente ligadas a una clase.';
comment on table public.catalogo_destino is 'Sitios de reubicación de fauna rescatada.';

-- ── 2. Columnas que el frontend espera, si la tabla ya existía sin ellas ────
do $$
declare
    t text;
begin
    foreach t in array array['catalogo_clase', 'catalogo_especie', 'catalogo_destino'] loop
        execute format('alter table public.%I add column if not exists activo boolean not null default true', t);
        execute format('alter table public.%I add column if not exists orden integer not null default 0', t);
        raise notice 'Columnas activo/orden verificadas en public.%', t;
    end loop;
end $$;

-- ── 3. Lectura para el equipo MHR, escritura para administradores ──────────
-- mhr_es_miembro() la define 20260819_historial_so_lectura_equipo.sql.
do $$
declare
    t text;
begin
    foreach t in array array['catalogo_clase', 'catalogo_especie', 'catalogo_destino'] loop
        execute format('alter table public.%I enable row level security', t);

        execute format('drop policy if exists %I on public.%I', t || '_select_mhr', t);
        execute format(
            'create policy %I on public.%I for select to authenticated using (public.mhr_es_miembro())',
            t || '_select_mhr', t);

        execute format('drop policy if exists %I on public.%I', t || '_write_admin', t);
        execute format(
            'create policy %I on public.%I for all to authenticated
             using (public.mhr_is_admin()) with check (public.mhr_is_admin())',
            t || '_write_admin', t);

        raise notice 'Políticas de lectura/escritura aplicadas a public.%', t;
    end loop;
end $$;

-- ── 4. Datos base, sólo si la tabla quedó vacía ────────────────────────────
insert into public.catalogo_clase (nombre, orden)
select v.nombre, v.orden
from (values
    ('Ave', 1), ('Mamífero', 2), ('Reptil', 3), ('Anfibio', 4), ('Otro', 5)
) as v(nombre, orden)
where not exists (select 1 from public.catalogo_clase);

insert into public.catalogo_destino (nombre, orden)
select v.nombre, v.orden
from (values
    ('Área natural protegida', 1),
    ('Zona perimetral del aeródromo', 2),
    ('Centro de rescate / rehabilitación', 3),
    ('PROFEPA', 4),
    ('Zoológico', 5),
    ('Otro', 6)
) as v(nombre, orden)
where not exists (select 1 from public.catalogo_destino);

-- Especies del listado que ya usa el formulario, ligadas a su clase.
insert into public.catalogo_especie (nombre, clase_id, orden)
select v.nombre,
       (select c.id from public.catalogo_clase c where c.nombre = v.clase limit 1),
       v.orden
from (values
    ('Alondra cornuda (Eremophila alpestris)', 'Ave', 1),
    ('Bisbita norteamericana (Anthus rubescens)', 'Ave', 2),
    ('Tecolote llanero (Athene cunicularia)', 'Ave', 3),
    ('Playero blanco (Calidris alba)', 'Ave', 4),
    ('Playero de Baird (Calidris bairdii)', 'Ave', 5),
    ('Chorlo tildío (Charadrius vociferus)', 'Ave', 6),
    ('Cernicalo americano (Falco sparverius)', 'Ave', 7),
    ('Pinzón mexicano (Haemorhous mexicanus)', 'Ave', 8),
    ('Golondrina tijereta (Hirundo rustica)', 'Ave', 9),
    ('Liebre cola negra (Lepus californicus)', 'Mamífero', 10),
    ('Gorrión común (Passer domesticus)', 'Ave', 11),
    ('Gorrión sabanero (Passerculus sandwichensis)', 'Ave', 12),
    ('Zacatonero de Boterii (Peucaea botterii)', 'Ave', 13),
    ('Zanate mexicano (Quiscalus mexicanus)', 'Ave', 14),
    ('Pradero tortillaconchile (Sturnella magna)', 'Ave', 15),
    ('Lechuza de campanario (Tyto furcata)', 'Ave', 16),
    ('Tordo cabeza amarilla (Xanthocephalus xanthochephalus)', 'Ave', 17),
    ('Huilota común (Zenaida macroura)', 'Ave', 18)
) as v(nombre, clase, orden)
where not exists (select 1 from public.catalogo_especie);

notify pgrst, 'reload schema';

-- ── Diagnóstico: qué quedó disponible ──────────────────────────────────────
do $$
declare
    c int; e int; d int;
begin
    select count(*) into c from public.catalogo_clase   where activo;
    select count(*) into e from public.catalogo_especie where activo;
    select count(*) into d from public.catalogo_destino where activo;
    raise notice 'Catálogos activos → clase: %, especie: %, destino: %', c, e, d;
end $$;
