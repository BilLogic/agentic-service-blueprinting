-- Goal Setting (all paths): shared Zoom/Pencil Front Stage Tech description.

update public.cells c
set description = 'The tutor connects with student via Zoom/Pencil in individual breakout room.'
from public.paths p
join public.service_scenarios s on s.id = p.service_scenario_id
where c.path_id = p.id
  and s.name ilike '%goal setting%'
  and (
    c.content = 'Zoom/Pencil'
    or c.content like 'Zoom/Pencil%'
    or c.content like '%Zoom/Pencil%'
  );
