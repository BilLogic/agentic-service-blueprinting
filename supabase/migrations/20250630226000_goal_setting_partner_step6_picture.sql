-- Goal Setting scenario — Partner Action step 6 illustration (all paths)

update public.cells c
set picture = v.picture
from public.layers l,
     public.paths p,
     (
       values
         (
           'Partner Action: Teacher',
           'Handles student tech problems as they arise',
           '/blueprint-images/goal-setting/shared/partner-action/step-06-handle-tech-problems.png'
         )
     ) as v(layer_name, content, picture)
where c.layer_id = l.id
  and c.path_id = p.id
  and l.name = v.layer_name
  and c.content = v.content
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';
