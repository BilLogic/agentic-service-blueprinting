-- Service workflow schema from PLUS Service Hub ERD
-- Relationships:
--   service_request 1—n service_class
--   service_class n—1 service_domain
--   service_domain n—1 path
--   path n—n step (path_steps)
--   step n—n level_goal (step_level_goals)
--   level_goal 1—n call
--   step n—1 call (trigger)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.path_type as enum (
  'happy',
  'sad',
  'exception',
  'recovery',
  'other'
);

-- ---------------------------------------------------------------------------
-- Core entities
-- ---------------------------------------------------------------------------

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  path_type public.path_type not null default 'happy',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.paths is 'Workflow path (e.g. happy path, sad path)';
comment on column public.paths.path_type is 'Path Type from ERD: Happy, Sad, etc.';

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  description text,
  phase_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_requests is 'Top-level service request (Description, Phase Order)';

create table public.service_domains (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_domains is 'Domain contained in a single path';

create index service_domains_path_id_idx on public.service_domains (path_id);

create table public.service_classes (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests (id) on delete cascade,
  service_domain_id uuid not null references public.service_domains (id) on delete restrict,
  order_position integer not null default 0,
  name text not null,
  description text,
  service_scenario_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_classes is 'Class assigned to a service request and contained in a service domain';

create index service_classes_service_request_id_idx on public.service_classes (service_request_id);
create index service_classes_service_domain_id_idx on public.service_classes (service_domain_id);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.steps is 'Step/Process node (Position)';

create table public.path_steps (
  path_id uuid not null references public.paths (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  primary key (path_id, step_id)
);

comment on table public.path_steps is 'M:N — Path Involved Step/Process';

create index path_steps_step_id_idx on public.path_steps (step_id);

create table public.level_goals (
  id uuid primary key default gen_random_uuid(),
  users text,
  front_stage_employees text,
  front_end_employee_tech text,
  back_stage_tech text,
  backend_employee text,
  internal_support text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.level_goals is 'Level/Goal with actor-channel attributes from ERD';

create table public.step_level_goals (
  step_id uuid not null references public.steps (id) on delete cascade,
  level_goal_id uuid not null references public.level_goals (id) on delete cascade,
  primary key (step_id, level_goal_id)
);

comment on table public.step_level_goals is 'M:N — Step/Process Involved Level/Goal';

create index step_level_goals_level_goal_id_idx on public.step_level_goals (level_goal_id);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  level_goal_id uuid not null references public.level_goals (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.calls is 'External action the end user can perform (Content); called from Level/Goal';

create index calls_level_goal_id_idx on public.calls (level_goal_id);

alter table public.steps
  add column call_id uuid references public.calls (id) on delete set null;

comment on column public.steps.call_id is 'M:N triggers resolved as n steps → 1 call';

create index steps_call_id_idx on public.steps (call_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
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

create trigger set_paths_updated_at
  before update on public.paths
  for each row execute function public.set_updated_at();

create trigger set_service_requests_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

create trigger set_service_domains_updated_at
  before update on public.service_domains
  for each row execute function public.set_updated_at();

create trigger set_service_classes_updated_at
  before update on public.service_classes
  for each row execute function public.set_updated_at();

create trigger set_steps_updated_at
  before update on public.steps
  for each row execute function public.set_updated_at();

create trigger set_level_goals_updated_at
  before update on public.level_goals
  for each row execute function public.set_updated_at();

create trigger set_calls_updated_at
  before update on public.calls
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (read-only for anon; tighten when auth is added)
-- ---------------------------------------------------------------------------

alter table public.paths enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_domains enable row level security;
alter table public.service_classes enable row level security;
alter table public.steps enable row level security;
alter table public.path_steps enable row level security;
alter table public.level_goals enable row level security;
alter table public.step_level_goals enable row level security;
alter table public.calls enable row level security;

create policy "paths_select" on public.paths for select using (true);
create policy "service_requests_select" on public.service_requests for select using (true);
create policy "service_domains_select" on public.service_domains for select using (true);
create policy "service_classes_select" on public.service_classes for select using (true);
create policy "steps_select" on public.steps for select using (true);
create policy "path_steps_select" on public.path_steps for select using (true);
create policy "level_goals_select" on public.level_goals for select using (true);
create policy "step_level_goals_select" on public.step_level_goals for select using (true);
create policy "calls_select" on public.calls for select using (true);
