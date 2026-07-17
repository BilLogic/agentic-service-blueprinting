-- Goal Setting — Support Actions description across all paths

update public.cells c
set description = 'Dev Team Builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
from public.layers l
join public.paths p on p.id = l.path_id
where c.layer_id = l.id
  and l.name = 'Support Actions'
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';
