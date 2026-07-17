-- Goal Setting — ensure Dev Team / Design team Support Actions exist on PLUS App steps

insert into public.cells (id, path_id, layer_id, step_id, content, description)
values
  (
    'a0000000-0000-4000-8000-0000001a0509',
    'a0000000-0000-4000-8000-00000000080c',
    'a0000000-0000-4000-8000-000000000856',
    'a0000000-0000-4000-8000-000000000984',
    E'Dev Team\nDesign team',
    'Dev Team Builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
  ),
  (
    'a0000000-0000-4000-8000-0000001f0909',
    'a0000000-0000-4000-8000-000000000811',
    'a0000000-0000-4000-8000-0000000008a8',
    'a0000000-0000-4000-8000-000000009a09',
    E'Dev Team\nDesign team',
    'Dev Team Builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
  ),
  (
    'a0000000-0000-4000-8000-000000b00909',
    'a0000000-0000-4000-8000-000000000815',
    'a0000000-0000-4000-8000-0000000008d8',
    'a0000000-0000-4000-8000-000000009d09',
    E'Dev Team\nDesign team',
    'Dev Team Builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
  ),
  (
    'a0000000-0000-4000-8000-000000d01009',
    'a0000000-0000-4000-8000-000000000817',
    'a0000000-0000-4000-8000-0000000008f8',
    'a0000000-0000-4000-8000-000000009e0a',
    E'Dev Team\nDesign team',
    'Dev Team Builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
  )
on conflict (id) do update
set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content,
  description = excluded.description;

update public.cells c
set description =
  'Dev Team Builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
from public.layers l_support,
     public.paths p,
     public.cells c_tech,
     public.layers l_tech
where c.layer_id = l_support.id
  and l_support.name = 'Support Actions'
  and c.path_id = p.id
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204'
  and (
    c.content = E'Dev Team\nDesign team'
    or c.content = 'Dev Team\nDesign Team'
    or c.content = 'Dev Team, Design team'
    or c.content like '%Dev Team%Design team%'
  )
  and c_tech.path_id = c.path_id
  and c_tech.step_id = c.step_id
  and c_tech.layer_id = l_tech.id
  and l_tech.name = 'Front Stage Tech'
  and c_tech.content like '%PLUS App%';
