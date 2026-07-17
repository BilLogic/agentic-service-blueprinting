-- Goal Setting scenario — shared Lead Tutor step illustrations (all paths)

update public.cells c
set picture = v.picture
from public.layers l,
     public.paths p,
     (
       values
         (
           'Lead Tutor',
           'Rename students to match roster name',
           '/blueprint-images/goal-setting/happy-path/lead-tutor/step-01-rename-students.png'
         ),
         (
           'Lead Tutor',
           'Add any un-rostered students to attendance list',
           '/blueprint-images/goal-setting/happy-path/lead-tutor/step-02-add-unrostered-students.png'
         ),
         (
           'Lead Tutor',
           'Manually assign unpaired students to available tutors',
           '/blueprint-images/goal-setting/happy-path/lead-tutor/step-03-assign-unpaired-students.png'
         ),
         (
           'Lead Tutor',
           'Inform Classroom teacher about students that are absent',
           '/blueprint-images/goal-setting/happy-path/lead-tutor/step-04-inform-absent-students.png'
         ),
         (
           'Lead Tutor',
           'Respond to classroom teachers "ask for help" request',
           '/blueprint-images/goal-setting/happy-path/lead-tutor/step-05-respond-ask-for-help.png'
         )
     ) as v(layer_name, content, picture)
where c.layer_id = l.id
  and c.path_id = p.id
  and l.name = v.layer_name
  and c.content = v.content
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';
