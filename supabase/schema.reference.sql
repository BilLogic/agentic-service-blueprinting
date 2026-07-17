-- Reference snapshot: Service Blueprint schema
-- Source of truth: supabase/migrations/
-- Snapshot verified against migrations through 20260716120000_layer_role.sql (2026-07-16).
-- Note: a legacy `public.services` table from 20250602160000_initial.sql still exists in
-- live databases (never dropped); it is unused by the app and excluded from this snapshot.

-- Hierarchy
create table public.service_lifecycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table public.service_scenarios (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.phases (id) on delete cascade,
  name text not null,
  description text,
  order_position integer not null default 0,
  view_type text not null default 'single' check (view_type in ('single', 'side-by-side', 'integrated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  service_scenario_id uuid not null references public.service_scenarios (id) on delete cascade,
  name text not null,
  description text,
  note text, -- optional path note shown alongside path metadata (e.g. parallel scenario context)
  path_type text not null check (path_type in ('happy', 'unhappy', 'exception', 'alternative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Blueprint grid
create table public.layers (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  name text not null,
  -- Semantic role key driving rendering (canonical: customer_actions,
  -- frontstage_actions, backstage_actions, frontstage_tech, backstage_tech,
  -- support_systems, visual, step_visual; extensible; null = generic swimlane).
  layer_role text,
  row_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  service_scenario_id uuid not null references public.service_scenarios (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.path_steps (
  path_id uuid not null references public.paths (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  column_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (path_id, step_id),
  unique (path_id, column_position)
);

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
  unique (layer_id, step_id),
  check (jsonb_typeof(links) = 'array')
);

create table public.cell_triggers (
  id uuid primary key default gen_random_uuid(),
  source_cell_id uuid not null references public.cells (id) on delete cascade,
  target_cell_id uuid not null references public.cells (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_cell_id, target_cell_id),
  check (source_cell_id <> target_cell_id)
);
