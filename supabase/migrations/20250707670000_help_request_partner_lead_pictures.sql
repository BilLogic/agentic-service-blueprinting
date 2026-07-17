-- Help Request — Partner Action and Lead Tutor step visuals
-- (same illustrations as Warm-Up and Goal Setting)

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
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000205';

update public.cells c
set picture = v.picture
from public.layers l,
     public.paths p,
     (
       values
         (
           'Partner Action: Teacher',
           'Circulate and quietly observe the students',
           '/blueprint-images/goal-setting/shared/partner-action/step-01-circulate-observe.png'
         ),
         (
           'Partner Action: Teacher',
           'Remind students to keep working while waiting',
           '/blueprint-images/goal-setting/shared/partner-action/step-02-remind-students-working.png'
         ),
         (
           'Partner Action: Teacher',
           'Checks if all students are in the correct breakout room',
           '/blueprint-images/goal-setting/shared/partner-action/step-03-check-breakout-rooms.png'
         ),
         (
           'Partner Action: Teacher',
           'Receives information that student is absent from session',
           '/blueprint-images/goal-setting/shared/partner-action/step-04-student-absent.png'
         ),
         (
           'Partner Action: Teacher',
           'Alerts lead tutor about unassigned or miss-assigned students using the "ask for help" alert',
           '/blueprint-images/goal-setting/shared/partner-action/step-05-ask-for-help-alert.png'
         ),
         (
           'Partner Action: Teacher',
           'Handles student tech problems as they arise',
           '/blueprint-images/goal-setting/shared/partner-action/step-06-handle-tech-problems.png'
         ),
         (
           'Partner Action: Teacher',
           'Escalates unresolved issues to tutors@tutor.plus promptly',
           '/blueprint-images/goal-setting/shared/partner-action/step-07-escalate-to-tutors-plus.png'
         )
     ) as v(layer_name, content, picture)
where c.layer_id = l.id
  and c.path_id = p.id
  and l.name = v.layer_name
  and c.content = v.content
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000205';
