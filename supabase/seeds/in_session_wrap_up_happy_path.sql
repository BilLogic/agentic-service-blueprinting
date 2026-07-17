-- In-session → Wrap-Up scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/wrapUpHappyPathFallback.ts

update public.service_scenarios
set
  description = 'Teachers and tutors close breakout sessions, debrief, and complete wrap-up tasks.',
  view_type = 'side-by-side'
where id = 'a0000000-0000-4000-8000-000000000206';

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-00000000080e',
  'a0000000-0000-4000-8000-000000000206',
  'Happy Path',
  'Teachers and tutors close breakout sessions, debrief, and complete wrap-up tasks.',
  'happy'
)
on conflict (id) do update set
  service_scenario_id = excluded.service_scenario_id,
  name = excluded.name,
  description = excluded.description,
  path_type = excluded.path_type;

delete from public.cell_triggers
where source_cell_id in (
  select id from public.cells
  where path_id = 'a0000000-0000-4000-8000-00000000080e'
);

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-00000000080e';

delete from public.layers
where path_id = 'a0000000-0000-4000-8000-00000000080e';

insert into public.layers (id, path_id, name, row_position)
values
  ('a0000000-0000-4000-8000-000000000870', 'a0000000-0000-4000-8000-00000000080e', 'Visual', 0),
  ('a0000000-0000-4000-8000-000000000871', 'a0000000-0000-4000-8000-00000000080e', 'Partner Action: Teacher', 1),
  ('a0000000-0000-4000-8000-000000000872', 'a0000000-0000-4000-8000-00000000080e', 'Lead Tutor', 2),
  ('a0000000-0000-4000-8000-000000000873', 'a0000000-0000-4000-8000-00000000080e', 'Regular Tutor', 3),
  ('a0000000-0000-4000-8000-000000000874', 'a0000000-0000-4000-8000-00000000080e', 'Front Stage Tech', 4),
  ('a0000000-0000-4000-8000-000000000875', 'a0000000-0000-4000-8000-00000000080e', 'Front Stage Actions', 5),
  ('a0000000-0000-4000-8000-000000000877', 'a0000000-0000-4000-8000-00000000080e', 'Back Stage Tech', 6),
  ('a0000000-0000-4000-8000-000000000876', 'a0000000-0000-4000-8000-00000000080e', 'Back Stage Actions', 7),
  ('a0000000-0000-4000-8000-000000000878', 'a0000000-0000-4000-8000-00000000080e', 'Support Actions', 8)
on conflict (id) do update set
  name = excluded.name,
  row_position = excluded.row_position,
  path_id = excluded.path_id;

insert into public.steps (id, service_scenario_id, name)
values
  ('a0000000-0000-4000-8000-000000000980', 'a0000000-0000-4000-8000-000000000206', 'Close breakout sessions'),
  ('a0000000-0000-4000-8000-000000000981', 'a0000000-0000-4000-8000-000000000206', 'Thank students'),
  ('a0000000-0000-4000-8000-000000000982', 'a0000000-0000-4000-8000-000000000206', 'Debrief with tutors'),
  ('a0000000-0000-4000-8000-000000000983', 'a0000000-0000-4000-8000-000000000206', 'Complete wrap-up')
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

delete from public.path_steps
where path_id = 'a0000000-0000-4000-8000-00000000080e';

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000980', 1),
  ('a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000981', 2),
  ('a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000982', 3),
  ('a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000983', 4)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  ('a0000000-0000-4000-8000-0000001c0110', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000870', 'a0000000-0000-4000-8000-000000000980', ''),
  ('a0000000-0000-4000-8000-0000001c0210', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000870', 'a0000000-0000-4000-8000-000000000981', ''),
  ('a0000000-0000-4000-8000-0000001c0310', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000870', 'a0000000-0000-4000-8000-000000000982', ''),
  ('a0000000-0000-4000-8000-0000001c0410', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000870', 'a0000000-0000-4000-8000-000000000983', ''),
  ('a0000000-0000-4000-8000-0000001c0101', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000871', 'a0000000-0000-4000-8000-000000000980', 'Help students log out of Zoom.'),
  ('a0000000-0000-4000-8000-0000001c0201', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000871', 'a0000000-0000-4000-8000-000000000981', 'Remind students to save their work or note what they accomplished.'),
  ('a0000000-0000-4000-8000-0000001c0301', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000871', 'a0000000-0000-4000-8000-000000000982', 'Encourage them to reflect on what they learned or practiced.'),
  ('a0000000-0000-4000-8000-0000001c0401', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000871', 'a0000000-0000-4000-8000-000000000983', 'Share quick reminders to students about what to bring or prepare for next time.'),
  ('a0000000-0000-4000-8000-0000001c0102', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000872', 'a0000000-0000-4000-8000-000000000980', 'Close breakout rooms.'),
  ('a0000000-0000-4000-8000-0000001c0202', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000872', 'a0000000-0000-4000-8000-000000000981', 'Thank students.'),
  ('a0000000-0000-4000-8000-0000001c0302', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000872', 'a0000000-0000-4000-8000-000000000982', 'Debrief with tutors.'),
  ('a0000000-0000-4000-8000-0000001c0402', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000872', 'a0000000-0000-4000-8000-000000000983', 'Remind tutors to upload Zoom recording and complete reflection form.'),
  ('a0000000-0000-4000-8000-0000001c0103', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000873', 'a0000000-0000-4000-8000-000000000980', 'Return to main room.'),
  ('a0000000-0000-4000-8000-0000001c0203', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000873', 'a0000000-0000-4000-8000-000000000981', 'Thank students.'),
  ('a0000000-0000-4000-8000-0000001c0303', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000873', 'a0000000-0000-4000-8000-000000000982', 'Debrief with lead tutor.'),
  ('a0000000-0000-4000-8000-0000001c0403', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000873', 'a0000000-0000-4000-8000-000000000983', 'Fill out reflection form and upload Zoom recording.'),
  ('a0000000-0000-4000-8000-0000001c0106', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000875', 'a0000000-0000-4000-8000-000000000980', 'Zoom/Pencil'),
  ('a0000000-0000-4000-8000-0000001c0206', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000875', 'a0000000-0000-4000-8000-000000000981', 'Zoom/Pencil'),
  ('a0000000-0000-4000-8000-0000001c0306', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000875', 'a0000000-0000-4000-8000-000000000982', 'Zoom/Pencil'),
  ('a0000000-0000-4000-8000-0000001c0406', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000875', 'a0000000-0000-4000-8000-000000000983', 'PLUS App'),
  ('a0000000-0000-4000-8000-0000001c0409', 'a0000000-0000-4000-8000-00000000080e', 'a0000000-0000-4000-8000-000000000878', 'a0000000-0000-4000-8000-000000000983', E'Dev Team\nDesign Team')
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

update public.cells
set picture = '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id in (
    'a0000000-0000-4000-8000-0000001c0106',
    'a0000000-0000-4000-8000-0000001c0206',
    'a0000000-0000-4000-8000-0000001c0306'
  );

update public.cells
set description =
  'Tutor connects with the other tutors and students via Zoom/Pencil.'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0106';

update public.cells
set description =
  'Tutors connect with the students via Zoom/Pencil.'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0206';

update public.cells
set description =
  'Tutors connect with lead tutors via Zoom/Pencil.'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0306';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/partner/step-01-help-students-log-out-zoom.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0101';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/partner/step-02-remind-save-work.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0201';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/partner/step-03-encourage-reflect.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0301';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/partner/step-04-reminders-next-time.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0401';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/lead-tutor/step-01-close-breakout-rooms.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0102';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/lead-tutor/step-02-thank-students.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0202';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/lead-tutor/step-03-debrief-with-tutors.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0302';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/lead-tutor/step-04-remind-upload-reflection.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0402';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/regular-tutor/step-01-return-to-main-room.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0103';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/regular-tutor/step-02-thank-students.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0203';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/regular-tutor/step-03-debrief-with-lead-tutor.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0303';

update public.cells
set picture = '/blueprint-images/wrap-up/happy-path/regular-tutor/step-04-reflection-upload-recording.png'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0403';

update public.cells
set description =
  'Dev Team builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0409';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor completes the reflection form in the PLUS app after the session.',
    'picture', '/blueprint-images/wrap-up/happy-path/plus-app/step-04-reflection-form.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=563-296430&t=XKhgzk0ZQ9Na4Nqs-1'
  )
)
where path_id = 'a0000000-0000-4000-8000-00000000080e'
  and id = 'a0000000-0000-4000-8000-0000001c0406';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-00000009a001', 'a0000000-0000-4000-8000-0000001c0101', 'a0000000-0000-4000-8000-0000001c0201'),
  ('a0000000-0000-4000-8000-00000009a002', 'a0000000-0000-4000-8000-0000001c0201', 'a0000000-0000-4000-8000-0000001c0301'),
  ('a0000000-0000-4000-8000-00000009a003', 'a0000000-0000-4000-8000-0000001c0301', 'a0000000-0000-4000-8000-0000001c0401'),
  ('a0000000-0000-4000-8000-00000009a010', 'a0000000-0000-4000-8000-0000001c0102', 'a0000000-0000-4000-8000-0000001c0202'),
  ('a0000000-0000-4000-8000-00000009a011', 'a0000000-0000-4000-8000-0000001c0202', 'a0000000-0000-4000-8000-0000001c0302'),
  ('a0000000-0000-4000-8000-00000009a012', 'a0000000-0000-4000-8000-0000001c0302', 'a0000000-0000-4000-8000-0000001c0402'),
  ('a0000000-0000-4000-8000-00000009a020', 'a0000000-0000-4000-8000-0000001c0103', 'a0000000-0000-4000-8000-0000001c0203'),
  ('a0000000-0000-4000-8000-00000009a021', 'a0000000-0000-4000-8000-0000001c0203', 'a0000000-0000-4000-8000-0000001c0303'),
  ('a0000000-0000-4000-8000-00000009a022', 'a0000000-0000-4000-8000-0000001c0303', 'a0000000-0000-4000-8000-0000001c0403'),
  ('a0000000-0000-4000-8000-00000009a033', 'a0000000-0000-4000-8000-0000001c0302', 'a0000000-0000-4000-8000-0000001c0303'),
  ('a0000000-0000-4000-8000-00000009a034', 'a0000000-0000-4000-8000-0000001c0303', 'a0000000-0000-4000-8000-0000001c0302'),
  ('a0000000-0000-4000-8000-00000009a113', 'a0000000-0000-4000-8000-0000001c0103', 'a0000000-0000-4000-8000-0000001c0106'),
  ('a0000000-0000-4000-8000-00000009a114', 'a0000000-0000-4000-8000-0000001c0203', 'a0000000-0000-4000-8000-0000001c0206'),
  ('a0000000-0000-4000-8000-00000009a115', 'a0000000-0000-4000-8000-0000001c0303', 'a0000000-0000-4000-8000-0000001c0306'),
  ('a0000000-0000-4000-8000-00000009a116', 'a0000000-0000-4000-8000-0000001c0403', 'a0000000-0000-4000-8000-0000001c0406')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
