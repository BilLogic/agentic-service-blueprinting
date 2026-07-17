-- Optional path-level note (e.g. parallel in-session scenario context).

alter table public.paths
  add column if not exists note text;

comment on column public.paths.note is
  'Optional path note shown alongside path metadata (e.g. parallel scenario context)';

update public.paths
set note = 'This scenario can run in parallel with the Goal Setting and Help Request scenarios.'
where service_scenario_id = 'a0000000-0000-4000-8000-000000000203';

update public.paths
set note = 'This scenario can run in parallel with the Warm-Up and Help Request scenarios.'
where service_scenario_id = 'a0000000-0000-4000-8000-000000000204';

update public.paths
set note = 'This scenario can run in parallel with the Warm-Up and Goal Setting scenarios.'
where service_scenario_id = 'a0000000-0000-4000-8000-000000000205';
