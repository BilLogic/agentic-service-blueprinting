-- Goal Setting scenario — Partner Action step 5 illustration (all paths)

update public.cells c
set picture = v.picture
from public.layers l,
     public.paths p,
     (
       values
         (
           'Partner Action: Teacher',
           'Alerts lead tutor about unassigned or miss-assigned students using the "ask for help" alert',
           '/blueprint-images/goal-setting/shared/partner-action/step-05-ask-for-help-alert.png'
         )
     ) as v(layer_name, content, picture)
where c.layer_id = l.id
  and c.path_id = p.id
  and l.name = v.layer_name
  and c.content = v.content
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';
