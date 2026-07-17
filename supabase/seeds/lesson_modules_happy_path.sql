-- Onboarding → Lesson Modules scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/lessonModulesHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000000802',
  'a0000000-0000-4000-8000-000000000124',
  'Happy Path',
  'Tutor completes lesson modules.',
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
  where path_id = 'a0000000-0000-4000-8000-000000000802'
);

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-000000000802';

delete from public.layers
where path_id = 'a0000000-0000-4000-8000-000000000802';

insert into public.layers (id, path_id, name, row_position)
values
  (
    'a0000000-0000-4000-8000-000000001240',
    'a0000000-0000-4000-8000-000000000802',
    'Visual',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000001241',
    'a0000000-0000-4000-8000-000000000802',
    'Regular Tutor',
    1
  ),
  (
    'a0000000-0000-4000-8000-000000001243',
    'a0000000-0000-4000-8000-000000000802',
    'Front Stage Tech',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000001242',
    'a0000000-0000-4000-8000-000000000802',
    'Front Stage Actions',
    3
  ),
  (
    'a0000000-0000-4000-8000-000000001245',
    'a0000000-0000-4000-8000-000000000802',
    'Back Stage Tech',
    4
  ),
  (
    'a0000000-0000-4000-8000-000000001244',
    'a0000000-0000-4000-8000-000000000802',
    'Back Stage Actions',
    5
  ),
  (
    'a0000000-0000-4000-8000-000000001246',
    'a0000000-0000-4000-8000-000000000802',
    'Support Actions',
    6
  )
on conflict (id) do update set
  name = excluded.name,
  row_position = excluded.row_position,
  path_id = excluded.path_id;

insert into public.steps (id, service_scenario_id, name)
values
  (
    'a0000000-0000-4000-8000-000000000861',
    'a0000000-0000-4000-8000-000000000124',
    'Open lesson'
  ),
  (
    'a0000000-0000-4000-8000-000000000862',
    'a0000000-0000-4000-8000-000000000124',
    'Work through questions'
  ),
  (
    'a0000000-0000-4000-8000-000000000863',
    'a0000000-0000-4000-8000-000000000124',
    'Finish lesson'
  )
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000000861', 1),
  ('a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000000862', 2),
  ('a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000000863', 3)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  ('a0000000-0000-4000-8000-000000120110', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001240', 'a0000000-0000-4000-8000-000000000861', ''),
  ('a0000000-0000-4000-8000-000000120210', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001240', 'a0000000-0000-4000-8000-000000000862', ''),
  ('a0000000-0000-4000-8000-000000120310', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001240', 'a0000000-0000-4000-8000-000000000863', ''),

  ('a0000000-0000-4000-8000-000000120103', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001241', 'a0000000-0000-4000-8000-000000000861', 'Opens next uncompleted assigned lesson.'),
  ('a0000000-0000-4000-8000-000000120106', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001243', 'a0000000-0000-4000-8000-000000000861', 'PLUS App'),
  ('a0000000-0000-4000-8000-000000120107', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001244', 'a0000000-0000-4000-8000-000000000861', 'Tutor supervisor team assigns lessons.'),
  ('a0000000-0000-4000-8000-000000120109', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001246', 'a0000000-0000-4000-8000-000000000861', E'Researchers help guide instructional implementation.\nDev Team\nDesign Team'),

  ('a0000000-0000-4000-8000-000000120203', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001241', 'a0000000-0000-4000-8000-000000000862', 'Works through the questions.'),
  ('a0000000-0000-4000-8000-000000120206', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001243', 'a0000000-0000-4000-8000-000000000862', 'PLUS App'),
  ('a0000000-0000-4000-8000-000000120207', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001244', 'a0000000-0000-4000-8000-000000000862', 'Instructional design team designs and maintains lessons.'),
  ('a0000000-0000-4000-8000-000000120208', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001245', 'a0000000-0000-4000-8000-000000000862', 'Notion'),
  ('a0000000-0000-4000-8000-000000120209', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001246', 'a0000000-0000-4000-8000-000000000862', E'Researchers help guide instructional implementation.\nDev Team\nDesign Team'),

  ('a0000000-0000-4000-8000-000000120303', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001241', 'a0000000-0000-4000-8000-000000000863', 'Finishes lesson and receives score.'),
  ('a0000000-0000-4000-8000-000000120306', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001243', 'a0000000-0000-4000-8000-000000000863', 'PLUS App'),
  ('a0000000-0000-4000-8000-000000120307', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001244', 'a0000000-0000-4000-8000-000000000863', 'Instructional design team designs and maintains lessons.'),
  ('a0000000-0000-4000-8000-000000120308', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001245', 'a0000000-0000-4000-8000-000000000863', 'Notion'),
  ('a0000000-0000-4000-8000-000000120309', 'a0000000-0000-4000-8000-000000000802', 'a0000000-0000-4000-8000-000000001246', 'a0000000-0000-4000-8000-000000000863', E'Dev Team\nDesign Team')
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

delete from public.cell_triggers
where id in (
  select id from public.cell_triggers
  where source_cell_id in (
    select id from public.cells
    where path_id = 'a0000000-0000-4000-8000-000000000802'
  )
);

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000090001', 'a0000000-0000-4000-8000-000000120103', 'a0000000-0000-4000-8000-000000120106'),
  ('a0000000-0000-4000-8000-000000090002', 'a0000000-0000-4000-8000-000000120203', 'a0000000-0000-4000-8000-000000120206'),
  ('a0000000-0000-4000-8000-000000090003', 'a0000000-0000-4000-8000-000000120303', 'a0000000-0000-4000-8000-000000120306'),
  ('a0000000-0000-4000-8000-000000090011', 'a0000000-0000-4000-8000-000000120103', 'a0000000-0000-4000-8000-000000120203'),
  ('a0000000-0000-4000-8000-000000090012', 'a0000000-0000-4000-8000-000000120203', 'a0000000-0000-4000-8000-000000120303'),
  ('a0000000-0000-4000-8000-000000090013', 'a0000000-0000-4000-8000-000000120303', 'a0000000-0000-4000-8000-000000120103'),
  ('a0000000-0000-4000-8000-000000090031', 'a0000000-0000-4000-8000-000000120107', 'a0000000-0000-4000-8000-000000120106'),
  ('a0000000-0000-4000-8000-000000090032', 'a0000000-0000-4000-8000-000000120207', 'a0000000-0000-4000-8000-000000120208'),
  ('a0000000-0000-4000-8000-000000090033', 'a0000000-0000-4000-8000-000000120307', 'a0000000-0000-4000-8000-000000120308'),
  ('a0000000-0000-4000-8000-000000090034', 'a0000000-0000-4000-8000-000000120208', 'a0000000-0000-4000-8000-000000120206'),
  ('a0000000-0000-4000-8000-000000090035', 'a0000000-0000-4000-8000-000000120308', 'a0000000-0000-4000-8000-000000120306')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor starts the next uncompleted assigned lesson in the PLUS app.',
    'picture', '/blueprint-images/lesson-modules/happy-path/plus-app/step-01-lessons.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3385-256703&t=Fyqmb2RX2B0cj9sv-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000120106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor works through the lesson questions in the PLUS app.',
    'picture', '/blueprint-images/lesson-modules/happy-path/plus-app/step-02-lesson-questions.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3385-256698&t=3WtQ7pKHkR28zhEn-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000120206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The instructional design team uses Notion to design and maintain the lesson content.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000120208';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor finishes the lesson in the PLUS app and receives their score.',
    'picture', '/blueprint-images/lesson-modules/happy-path/plus-app/step-03-lesson-complete.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3385-256699&t=Fyqmb2RX2B0cj9sv-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000120306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The instructional design team uses Notion to design and maintain the lesson content.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000120308';

update public.cells
set description =
  'Researchers help guide how lesson content is designed and delivered so tutors learn effectively.

The Dev Team builds the PLUS app features for lesson modules, and the Design Team creates the screens and flows for that experience.'
where id in (
  'a0000000-0000-4000-8000-000000120109',
  'a0000000-0000-4000-8000-000000120209'
);

update public.cells
set description =
  'The Dev Team builds the PLUS app features for lesson modules, and the Design Team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000120309';

update public.cells
set picture = '/blueprint-images/lesson-modules/happy-path/regular-tutor/step-01-opens-lesson.png'
where id = 'a0000000-0000-4000-8000-000000120103';

update public.cells
set picture = '/blueprint-images/lesson-modules/happy-path/regular-tutor/step-02-works-through-questions.png'
where id = 'a0000000-0000-4000-8000-000000120203';

update public.cells
set picture = '/blueprint-images/lesson-modules/happy-path/regular-tutor/step-03-finishes-lesson.png'
where id = 'a0000000-0000-4000-8000-000000120303';
