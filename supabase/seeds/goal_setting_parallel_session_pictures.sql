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

-- Partner Action: Teacher
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
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';

-- Front Stage Tech — Zoom/Pencil logos (all paths, all steps)
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

-- Front Stage Tech — Zoom/Pencil shared description (all paths, all steps)
update public.cells c
set description = 'The tutor connects with student via Zoom/Pencil in individual breakout room.'
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

-- Front Stage Tech — Zoom/Pencil Share Screen step description (all paths)
update public.cells
set description = 'The tutor shares screen via Zoom/Pencil screen share feature.'
where id in (
  'a0000000-0000-4000-8000-0000001a0206',
  'a0000000-0000-4000-8000-0000001f0306',
  'a0000000-0000-4000-8000-000000a00306',
  'a0000000-0000-4000-8000-000000b00306',
  'a0000000-0000-4000-8000-000000c00406',
  'a0000000-0000-4000-8000-000000d00406'
);

-- Front Stage Tech — Zoom/Pencil Leave breakout room step description (all paths)
update public.cells
set description = 'The tutor leaves the student''s Zoom/Pencil breakout room.'
where id in (
  'a0000000-0000-4000-8000-0000001a0606',
  'a0000000-0000-4000-8000-0000001f1006',
  'a0000000-0000-4000-8000-000000a00706',
  'a0000000-0000-4000-8000-000000b01006',
  'a0000000-0000-4000-8000-000000c01106',
  'a0000000-0000-4000-8000-000000d01106'
);

-- Regular Tutor — step 1 illustration (all paths)
update public.cells c
set picture = '/blueprint-images/goal-setting/shared/regular-tutor/step-01-join-breakout-session.png'
from public.layers l,
     public.paths p,
     public.path_steps ps
where c.layer_id = l.id
  and c.path_id = p.id
  and ps.path_id = p.id
  and ps.step_id = c.step_id
  and l.name = 'Regular Tutor'
  and ps.column_position = 1
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';

-- Regular Tutor — step 2 illustration (all paths)
update public.cells c
set picture = '/blueprint-images/goal-setting/shared/regular-tutor/step-02-share-screen.png'
from public.layers l,
     public.paths p,
     public.steps s
where c.layer_id = l.id
  and c.path_id = p.id
  and c.step_id = s.id
  and l.name = 'Regular Tutor'
  and s.column_position = 2
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';

-- Regular Tutor — step 3 illustration (all paths)
update public.cells c
set picture = '/blueprint-images/goal-setting/shared/regular-tutor/step-03-goal-activity.png'
from public.layers l,
     public.paths p,
     public.steps s
where c.layer_id = l.id
  and c.path_id = p.id
  and c.step_id = s.id
  and l.name = 'Regular Tutor'
  and s.column_position = 3
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';

-- Regular Tutor — step 4 illustration (all paths)
update public.cells c
set picture = '/blueprint-images/goal-setting/shared/regular-tutor/step-04-goal-strategy.png'
from public.layers l,
     public.paths p,
     public.steps s
where c.layer_id = l.id
  and c.path_id = p.id
  and c.step_id = s.id
  and l.name = 'Regular Tutor'
  and s.column_position = 4
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';

-- Regular Tutor — step 5 illustration (all paths)
update public.cells c
set picture = '/blueprint-images/goal-setting/shared/regular-tutor/step-05-finalize-goals.png'
from public.layers l,
     public.paths p,
     public.steps s
where c.layer_id = l.id
  and c.path_id = p.id
  and c.step_id = s.id
  and l.name = 'Regular Tutor'
  and s.column_position = 5
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';

-- Regular Tutor — step 6 illustration (all paths)
update public.cells c
set picture = '/blueprint-images/goal-setting/shared/regular-tutor/step-06-leave-breakout-room.png'
from public.layers l,
     public.paths p,
     public.steps s
where c.layer_id = l.id
  and c.path_id = p.id
  and c.step_id = s.id
  and l.name = 'Regular Tutor'
  and s.column_position = 6
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';

-- Regular Tutor — step 7 illustration (all paths)
update public.cells c
set picture = '/blueprint-images/goal-setting/shared/regular-tutor/step-07-next-student.png'
from public.layers l,
     public.paths p,
     public.steps s
where c.layer_id = l.id
  and c.path_id = p.id
  and c.step_id = s.id
  and l.name = 'Regular Tutor'
  and s.column_position = 7
  and p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';
