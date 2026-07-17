-- Service Blueprint schema
-- Replaces legacy workflow ERD (20250602170000)
-- Hierarchy: service_lifecycles → phases → service_scenarios → paths
-- Blueprint per path: layers (rows), steps (columns), cells, cell_triggers

-- ---------------------------------------------------------------------------
-- Drop legacy workflow tables and enum
-- ---------------------------------------------------------------------------

drop trigger if exists set_calls_updated_at on public.calls;
drop trigger if exists set_level_goals_updated_at on public.level_goals;
drop trigger if exists set_steps_updated_at on public.steps;
drop trigger if exists set_service_classes_updated_at on public.service_classes;
drop trigger if exists set_service_domains_updated_at on public.service_domains;
drop trigger if exists set_service_requests_updated_at on public.service_requests;
drop trigger if exists set_paths_updated_at on public.paths;

drop policy if exists "calls_select" on public.calls;
drop policy if exists "step_level_goals_select" on public.step_level_goals;
drop policy if exists "level_goals_select" on public.level_goals;
drop policy if exists "path_steps_select" on public.path_steps;
drop policy if exists "steps_select" on public.steps;
drop policy if exists "service_classes_select" on public.service_classes;
drop policy if exists "service_domains_select" on public.service_domains;
drop policy if exists "service_requests_select" on public.service_requests;
drop policy if exists "paths_select" on public.paths;

drop table if exists public.calls cascade;
drop table if exists public.step_level_goals cascade;
drop table if exists public.path_steps cascade;
drop table if exists public.steps cascade;
drop table if exists public.level_goals cascade;
drop table if exists public.service_classes cascade;
drop table if exists public.service_domains cascade;
drop table if exists public.service_requests cascade;
drop table if exists public.paths cascade;

drop type if exists public.path_type cascade;

-- ---------------------------------------------------------------------------
-- Core hierarchy
-- ---------------------------------------------------------------------------

create table public.service_lifecycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_lifecycles is 'End-to-end service journey';

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  service_lifecycle_id uuid not null references public.service_lifecycles (id) on delete cascade,
  name text not null,
  description text,
  order_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.phases is 'Ordered phase within a service lifecycle';

create index phases_service_lifecycle_id_idx on public.phases (service_lifecycle_id);
create index phases_lifecycle_order_idx on public.phases (service_lifecycle_id, order_position);

create table public.service_scenarios (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.phases (id) on delete cascade,
  name text not null,
  description text,
  order_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_scenarios is 'Scenario within a phase';

create index service_scenarios_phase_id_idx on public.service_scenarios (phase_id);
create index service_scenarios_phase_order_idx on public.service_scenarios (phase_id, order_position);

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  service_scenario_id uuid not null references public.service_scenarios (id) on delete cascade,
  name text not null,
  path_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paths_path_type_check check (
    path_type in ('happy', 'unhappy', 'exception', 'alternative')
  )
);

comment on table public.paths is 'Service blueprint path (happy, unhappy, exception, alternative)';
comment on column public.paths.path_type is 'Path variant: happy, unhappy, exception, alternative';

create index paths_service_scenario_id_idx on public.paths (service_scenario_id);

-- ---------------------------------------------------------------------------
-- Blueprint grid (per path)
-- ---------------------------------------------------------------------------

create table public.layers (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  name text not null,
  row_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.layers is 'Blueprint row (e.g. Users, Front Stage Employees)';

create index layers_path_id_idx on public.layers (path_id);
create index layers_path_row_idx on public.layers (path_id, row_position);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  name text not null,
  column_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.steps is 'Blueprint column (journey step along the path)';

create index steps_path_id_idx on public.steps (path_id);
create index steps_path_column_idx on public.steps (path_id, column_position);

create table public.cells (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  layer_id uuid not null references public.layers (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cells_layer_step_unique unique (layer_id, step_id)
);

comment on table public.cells is 'Content at layer × step intersection';

create index cells_path_id_idx on public.cells (path_id);
create index cells_layer_id_idx on public.cells (layer_id);
create index cells_step_id_idx on public.cells (step_id);

create table public.cell_triggers (
  id uuid primary key default gen_random_uuid(),
  source_cell_id uuid not null references public.cells (id) on delete cascade,
  target_cell_id uuid not null references public.cells (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cell_triggers_source_target_unique unique (source_cell_id, target_cell_id),
  constraint cell_triggers_no_self_reference check (source_cell_id <> target_cell_id)
);

comment on table public.cell_triggers is 'Dependency from one cell to another';

create index cell_triggers_source_cell_id_idx on public.cell_triggers (source_cell_id);
create index cell_triggers_target_cell_id_idx on public.cell_triggers (target_cell_id);

-- ---------------------------------------------------------------------------
-- Cells: layer and step must belong to the same path as the cell
-- ---------------------------------------------------------------------------

create or replace function public.cells_validate_path_match()
returns trigger
language plpgsql
as $$
declare
  layer_path uuid;
  step_path uuid;
begin
  select path_id into layer_path from public.layers where id = new.layer_id;
  select path_id into step_path from public.steps where id = new.step_id;

  if layer_path is null or step_path is null then
    raise exception 'cells: layer_id or step_id does not exist';
  end if;

  if layer_path <> new.path_id or step_path <> new.path_id then
    raise exception 'cells.path_id must match layers.path_id and steps.path_id';
  end if;

  return new;
end;
$$;

create trigger cells_validate_path_match
  before insert or update on public.cells
  for each row execute function public.cells_validate_path_match();

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_service_lifecycles_updated_at
  before update on public.service_lifecycles
  for each row execute function public.set_updated_at();

create trigger set_phases_updated_at
  before update on public.phases
  for each row execute function public.set_updated_at();

create trigger set_service_scenarios_updated_at
  before update on public.service_scenarios
  for each row execute function public.set_updated_at();

create trigger set_paths_updated_at
  before update on public.paths
  for each row execute function public.set_updated_at();

create trigger set_layers_updated_at
  before update on public.layers
  for each row execute function public.set_updated_at();

create trigger set_steps_updated_at
  before update on public.steps
  for each row execute function public.set_updated_at();

create trigger set_cells_updated_at
  before update on public.cells
  for each row execute function public.set_updated_at();

create trigger set_cell_triggers_updated_at
  before update on public.cell_triggers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (read-only for anon until auth is added)
-- ---------------------------------------------------------------------------

alter table public.service_lifecycles enable row level security;
alter table public.phases enable row level security;
alter table public.service_scenarios enable row level security;
alter table public.paths enable row level security;
alter table public.layers enable row level security;
alter table public.steps enable row level security;
alter table public.cells enable row level security;
alter table public.cell_triggers enable row level security;

create policy "service_lifecycles_select" on public.service_lifecycles for select using (true);
create policy "phases_select" on public.phases for select using (true);
create policy "service_scenarios_select" on public.service_scenarios for select using (true);
create policy "paths_select" on public.paths for select using (true);
create policy "layers_select" on public.layers for select using (true);
create policy "steps_select" on public.steps for select using (true);
create policy "cells_select" on public.cells for select using (true);
create policy "cell_triggers_select" on public.cell_triggers for select using (true);
