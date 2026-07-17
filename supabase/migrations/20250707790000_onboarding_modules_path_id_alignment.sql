-- Onboarding Modules happy path — keep canonical path id 007201 in sync with fallbacks.

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000007201',
  'a0000000-0000-4000-8000-000000000123',
  'Happy Path',
  'Tutor succesfully completes onboarding modules.',
  'happy'
)
on conflict (id) do update set
  service_scenario_id = excluded.service_scenario_id,
  name = excluded.name,
  description = excluded.description,
  path_type = excluded.path_type;
