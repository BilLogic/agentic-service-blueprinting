-- Goal Setting scenario — Regular Tutor step 5 illustration (all paths)

update public.cells c
set picture = '/blueprint-images/goal-setting/shared/regular-tutor/step-05-finalize-goals.png'
from public.layers l,
     public.paths p,
     public.path_steps ps
where c.layer_id = l.id
  and c.path_id = p.id
  and ps.path_id = p.id
  and ps.step_id = c.step_id
  and l.name = 'Regular Tutor'
  and ps.column_position = 5
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';
