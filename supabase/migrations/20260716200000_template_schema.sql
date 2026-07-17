-- Service Blueprint template schema (consolidated).
--
-- Single schema migration for the agentic-service-blueprinting template,
-- replacing the original instance's 700+ migration history. Matches
-- supabase/schema.reference.sql exactly: hierarchy tables, blueprint grid,
-- path_steps ordering, cell metadata, layer_role, integrity trigger,
-- updated_at triggers, and read-only RLS. Content comes from seeds
-- (supabase/seed.sql) or the import pipeline — this file contains no content.

-- ---------------------------------------------------------------------------
-- Legacy cleanup: databases created from the original instance carried an
-- unused `services` catalog table (never dropped). Remove it if present.
-- ---------------------------------------------------------------------------

drop trigger if exists set_services_updated_at on public.services;
drop policy if exists "services_select" on public.services;
drop table if exists public.services cascade;

-- ---------------------------------------------------------------------------
-- Core hierarchy: service_lifecycles → phases → service_scenarios → paths
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
  loops_to_phase_id uuid references public.phases (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.phases is 'Ordered phase within a service lifecycle';
comment on column public.phases.loops_to_phase_id is
  'When set, UI shows a return transition from this phase to the target phase';

create index phases_service_lifecycle_id_idx on public.phases (service_lifecycle_id);
create index phases_lifecycle_order_idx on public.phases (service_lifecycle_id, order_position);
create index phases_loops_to_phase_id_idx on public.phases (loops_to_phase_id);

create table public.service_scenarios (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.phases (id) on delete cascade,
  name text not null,
  description text,
  order_position integer not null default 0,
  view_type text not null default 'single',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_scenarios_view_type_check check (
    view_type in ('single', 'side-by-side', 'integrated')
  )
);

comment on table public.service_scenarios is 'Scenario within a phase';
comment on column public.service_scenarios.view_type is
  'Blueprint layout: single path, side-by-side compare, or integrated merge.';

create index service_scenarios_phase_id_idx on public.service_scenarios (phase_id);
create index service_scenarios_phase_order_idx on public.service_scenarios (phase_id, order_position);

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  service_scenario_id uuid not null references public.service_scenarios (id) on delete cascade,
  name text not null,
  description text,
  note text,
  path_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paths_path_type_check check (
    path_type in ('happy', 'unhappy', 'exception', 'alternative')
  )
);

comment on table public.paths is 'Service blueprint path (happy, unhappy, exception, alternative)';
comment on column public.paths.path_type is 'Path variant: happy, unhappy, exception, alternative';
comment on column public.paths.description is 'Optional summary of what this path variant represents';
comment on column public.paths.note is
  'Optional path note shown alongside path metadata (e.g. parallel scenario context)';

create index paths_service_scenario_id_idx on public.paths (service_scenario_id);

-- ---------------------------------------------------------------------------
-- Blueprint grid: layers (rows, per path) × steps (columns, per scenario)
-- ---------------------------------------------------------------------------

create table public.layers (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  name text not null,
  layer_role text,
  row_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.layers is 'Blueprint row (swimlane) within a path';
comment on column public.layers.layer_role is
  'Semantic role key that drives rendering (pill cells, visual rows, divider-line anchoring); the display name stays in layers.name and is free-form in any language. Canonical values: customer_actions, frontstage_actions, backstage_actions, frontstage_tech, backstage_tech, support_systems, visual, step_visual. The vocabulary is extensible — org-defined custom roles are allowed and render as generic swimlanes. Null = generic swimlane (e.g. actor lanes).';

create index layers_path_id_idx on public.layers (path_id);
create index layers_path_row_idx on public.layers (path_id, row_position);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  service_scenario_id uuid not null references public.service_scenarios (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.steps is 'Blueprint column (journey step) scoped to a service scenario';
comment on column public.steps.service_scenario_id is 'Scenario that owns this canonical step';

create index steps_service_scenario_id_idx on public.steps (service_scenario_id);

create table public.path_steps (
  path_id uuid not null references public.paths (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  column_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint path_steps_pkey primary key (path_id, step_id),
  constraint path_steps_path_column_unique unique (path_id, column_position)
);

comment on table public.path_steps is 'Steps included on a path and their column order';
comment on column public.path_steps.column_position is 'Blueprint column index for this step on this path';

create index path_steps_step_id_idx on public.path_steps (step_id);
create index path_steps_path_column_idx on public.path_steps (path_id, column_position);

create table public.cells (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  layer_id uuid not null references public.layers (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  content text not null default '',
  picture text,
  description text,
  links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cells_layer_step_unique unique (layer_id, step_id),
  constraint cells_links_is_array check (jsonb_typeof(links) = 'array')
);

comment on table public.cells is 'Content at layer × step intersection';
comment on column public.cells.content is
  'Cell Label — primary blueprint text entered in the grid';
comment on column public.cells.picture is
  'Optional image URL or storage reference';
comment on column public.cells.description is
  'Optional longer cell description (detail panel, not grid label)';
comment on column public.cells.links is
  'Optional JSON array of link objects: { "type": string, "label": string, "url"?: string }';

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
-- Integrity: a cell's layer must belong to the cell's path, and the cell's
-- step must be linked to that path via path_steps.
-- ---------------------------------------------------------------------------

create or replace function public.cells_validate_path_match()
returns trigger
language plpgsql
as $$
declare
  layer_path uuid;
  step_on_path boolean;
begin
  select path_id into layer_path from public.layers where id = new.layer_id;

  select exists (
    select 1
    from public.path_steps ps
    where ps.path_id = new.path_id
      and ps.step_id = new.step_id
  ) into step_on_path;

  if layer_path is null then
    raise exception 'cells: layer_id does not exist';
  end if;

  if layer_path <> new.path_id then
    raise exception 'cells.path_id must match layers.path_id';
  end if;

  if not step_on_path then
    raise exception 'cells.step_id must be linked to cells.path_id in path_steps';
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

create trigger set_path_steps_updated_at
  before update on public.path_steps
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
alter table public.path_steps enable row level security;
alter table public.cells enable row level security;
alter table public.cell_triggers enable row level security;

create policy "service_lifecycles_select" on public.service_lifecycles for select using (true);
create policy "phases_select" on public.phases for select using (true);
create policy "service_scenarios_select" on public.service_scenarios for select using (true);
create policy "paths_select" on public.paths for select using (true);
create policy "layers_select" on public.layers for select using (true);
create policy "steps_select" on public.steps for select using (true);
create policy "path_steps_select" on public.path_steps for select using (true);
create policy "cells_select" on public.cells for select using (true);
create policy "cell_triggers_select" on public.cell_triggers for select using (true);
