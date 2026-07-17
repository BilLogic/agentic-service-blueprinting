-- Goal Setting scenario — Regular Tutor step 3 illustration (all paths)

update public.cells c
set picture = '/blueprint-images/goal-setting/shared/regular-tutor/step-03-goal-activity.png'
from public.layers l,
     public.paths p,
     public.path_steps ps
where c.layer_id = l.id
  and c.path_id = p.id
  and ps.path_id = p.id
  and ps.step_id = c.step_id
  and l.name = 'Regular Tutor'
  and ps.column_position = 3
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';
