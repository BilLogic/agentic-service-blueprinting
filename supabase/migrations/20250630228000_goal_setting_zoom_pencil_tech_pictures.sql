-- Goal Setting scenario — Zoom/Pencil Front Stage Tech logos (all paths, all steps)

update public.cells c
set picture = '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
from public.layers l,
     public.paths p
where c.layer_id = l.id
  and c.path_id = p.id
  and l.name = 'Front Stage Tech'
  and (
    c.content = 'Zoom/Pencil'
    or c.content like 'Zoom/Pencil,%'
    or c.content like '%, Zoom/Pencil'
    or c.content like '%, Zoom/Pencil,%'
  )
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';
