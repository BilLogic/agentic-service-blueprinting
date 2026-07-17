-- Scenario-scoped steps with per-path ordering via path_steps
-- Steps belong to service_scenarios; paths reference steps through path_steps.column_position

-- ---------------------------------------------------------------------------
-- path_steps junction (path ↔ step, order per path)
-- ---------------------------------------------------------------------------

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

-- Backfill from path-owned steps before dropping columns
insert into public.path_steps (path_id, step_id, column_position)
select path_id, id, column_position
from public.steps;

-- ---------------------------------------------------------------------------
-- steps: path_id → service_scenario_id (canonical step catalog per scenario)
-- ---------------------------------------------------------------------------

alter table public.steps
  add column service_scenario_id uuid references public.service_scenarios (id) on delete cascade;

update public.steps s
set service_scenario_id = p.service_scenario_id
from public.paths p
where s.path_id = p.id;

alter table public.steps
  alter column service_scenario_id set not null;

drop index if exists public.steps_path_id_idx;
drop index if exists public.steps_path_column_idx;

alter table public.steps
  drop column path_id,
  drop column column_position;

create index steps_service_scenario_id_idx on public.steps (service_scenario_id);

comment on table public.steps is 'Blueprint column (journey step) scoped to a service scenario';
comment on column public.steps.service_scenario_id is 'Scenario that owns this canonical step';

-- ---------------------------------------------------------------------------
-- cells: step must be assigned to the cell path via path_steps
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

-- ---------------------------------------------------------------------------
-- path_steps updated_at + RLS
-- ---------------------------------------------------------------------------

create trigger set_path_steps_updated_at
  before update on public.path_steps
  for each row execute function public.set_updated_at();

alter table public.path_steps enable row level security;

create policy "path_steps_select" on public.path_steps for select using (true);
