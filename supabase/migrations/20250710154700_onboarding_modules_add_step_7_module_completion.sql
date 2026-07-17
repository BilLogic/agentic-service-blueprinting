-- Onboarding Modules Happy Path — add step 7 (Module completion).

insert into public.steps (id, service_scenario_id, name)
values (
  'a0000000-0000-4000-8000-000000000857',
  'a0000000-0000-4000-8000-000000000123',
  'Module completion'
)
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

insert into public.path_steps (path_id, step_id, column_position)
values (
  'a0000000-0000-4000-8000-000000007201',
  'a0000000-0000-4000-8000-000000000857',
  7
)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content, description, links)
values
  (
    'a0000000-0000-4000-8000-000000110710',
    'a0000000-0000-4000-8000-000000007201',
    'a0000000-0000-4000-8000-000000000828',
    'a0000000-0000-4000-8000-000000000857',
    '',
    null,
    '[]'::jsonb
  ),
  (
    'a0000000-0000-4000-8000-000000110703',
    'a0000000-0000-4000-8000-000000007201',
    'a0000000-0000-4000-8000-000000000841',
    'a0000000-0000-4000-8000-000000000857',
    'Submits reflection questions and completes module.',
    null,
    '[]'::jsonb
  ),
  (
    'a0000000-0000-4000-8000-000000110706',
    'a0000000-0000-4000-8000-000000007201',
    'a0000000-0000-4000-8000-000000000843',
    'a0000000-0000-4000-8000-000000000857',
    'PLUS App',
    null,
    jsonb_build_array(
      jsonb_build_object(
        'type', 'tech_description',
        'label', 'PLUS App',
        'description', 'The tutor submits the reflection questions and completes the onboarding module in the PLUS app.'
      )
    )
  ),
  (
    'a0000000-0000-4000-8000-000000110709',
    'a0000000-0000-4000-8000-000000007201',
    'a0000000-0000-4000-8000-000000000846',
    'a0000000-0000-4000-8000-000000000857',
    E'Dev Team\nDesign Team',
    'The Dev Team builds the PLUS app features onboarding modules, and the Design Team creates the screens and flows for that experience.',
    '[]'::jsonb
  )
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content,
  description = excluded.description,
  links = excluded.links;

-- Tutor → PLUS App within step 7
insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000089007',
  'a0000000-0000-4000-8000-000000110703',
  'a0000000-0000-4000-8000-000000110706'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

-- Forward chain: step 6 → step 7
insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000089017',
  'a0000000-0000-4000-8000-000000110603',
  'a0000000-0000-4000-8000-000000110703'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

-- Move module loop from step 6 → step 1 to step 7 → step 1
update public.cell_triggers
set
  source_cell_id = 'a0000000-0000-4000-8000-000000110703',
  target_cell_id = 'a0000000-0000-4000-8000-000000110103'
where id = 'a0000000-0000-4000-8000-000000089016';
